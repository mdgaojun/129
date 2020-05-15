import ColorHash from "color-hash";
import Immutable from "immutable";
import nullthrows from "nullthrows";
import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Grid from "@material-ui/core/Grid";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Slider from "@material-ui/core/Slider";

import WeChatDonation from "./donation_wechat.jpg";

const JSON_URL =
  "https://raw.githubusercontent.com/vicdus/uscis-case-statistics/master/src/data.json";

function getColor(s: string): string {
  return (
    Immutable.Map.of(
      "Case Was Received",
      "#999900",
      "Case Was Approved",
      "#00FF00"
    ).get(s) ?? new ColorHash().hex(s)
  );
}

function App() {
  const [selectedForm, setSelectedForm] = useState<string>("I-129");
  const [selectedCenter, setSelectedCenter] = useState<string>("WAC");
  const [selectedUpdateDay, setSelectedUpdateDay] = useState<string | null>(
    null
  );
  const [caseData, setCaseData] = useState<Object>({});

  useEffect(() => {
    (async () => setCaseData(await (await fetch(JSON_URL)).json()))();
  }, []);

  const entires = Immutable.List(
    Object.entries(caseData).map(([key, count]) => {
      const [center, year, day, code, form, status, updateDay] = key.split("|");
      return {
        center,
        year,
        day,
        code,
        form,
        status,
        updateDay,
        count,
      };
    })
  );

  const selectedEntriesAllDate = entires.filter(
    (e) => e.form === selectedForm && e.center === selectedCenter
  );
  const availableUpdateDays = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.updateDay))
    .toSet()
    .toList()
    .sort();

  const countValueForAllDays = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.count))
    .toSet()
    .toList()
    .sort();

  const latestUpdateDay = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.updateDay))
    .max();

  const selectedEntries = selectedEntriesAllDate.filter(
    (e) => e.updateDay === (selectedUpdateDay ?? latestUpdateDay)?.toString()
  );

  const formTypes = entires.map((e) => e.form).toSet();
  const centerNames = entires.map((e) => e.center).toSet();
  const existStatus = selectedEntries.map((e) => e.status).toSet();
  const exisitDays = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.day))
    .toSet()
    .toList()
    .sort();

  const dataset = selectedEntries
    .groupBy((e) => e.day)
    .map((e, day) => {
      return {
        day,
        ...e
          .reduce(
            (counter, v) => counter.set(v.status, v.count),
            Immutable.Map<string, number>()
          )
          .toObject(),
      };
    })
    .toList()
    .sort((a, b) => Number.parseInt(a.day) - Number.parseInt(b.day))
    .toArray();

  const datasetWithBackfill = exisitDays
    .map((day) => dataset.find((v) => v.day === day.toString()) ?? { day })
    .toArray();

  const chart = (
    <LineChart width={1440} height={810} data={datasetWithBackfill}>
      <CartesianGrid strokeDasharray='3 3' />
      <XAxis dataKey='day' />
      <YAxis
        type='number'
        height={810}
        domain={[0, countValueForAllDays.max() ?? 1]}
      />
      <Tooltip
        offset={100}
        itemSorter={(a) => -a.payload[nullthrows(a.dataKey?.toString())]}
      />
      {existStatus.toArray().map((s, ind) => (
        <Line
          key={ind}
          type='linear'
          isAnimationActive={false}
          dataKey={s}
          stroke={getColor(s)}
        />
      ))}
    </LineChart>
  );

  const introduction = (
    <div>
      <h1>USCIS case progress tracker</h1>
      <h2>
        Current Form: {selectedForm}, location: {selectedCenter}, Last Update
        for this form and location:{" "}
        {new Date(1970, 0, latestUpdateDay ?? 0 + 1).toDateString()}
      </h2>
      <h3>Help needed for UI and clawer</h3>
      <p>GitHub project: https://github.com/vicdus/uscis-case-statistics/</p>
    </div>
  );

  const updateDayPicker = availableUpdateDays.max() ? (
    <Grid item xs={8}>
      <Slider
        style={{ marginLeft: "128px", marginRight: "128px" }}
        defaultValue={availableUpdateDays.max() ?? 1}
        onChange={(_, f) => setSelectedUpdateDay(f.toString())}
        aria-labelledby='discrete-slider'
        valueLabelDisplay='off'
        step={1}
        marks={availableUpdateDays
          .map((e) => ({
            value: e,
            label: new Date(1970, 0, e + 1).toDateString(),
          }))
          .toArray()}
        min={availableUpdateDays.min() ?? 0}
        max={availableUpdateDays.max() ?? 1}
      />
    </Grid>
  ) : null;

  const QA = (
    <div>
      <h3>Q and A</h3>
      <h4>Q: 怎么用？</h4>
      <p>A: 横坐标是号段，纵坐标是状态对应的数量。</p>
      <h4>Q: 你是谁？</h4>
      <p>A: 我今年抽中了h1b, 在等approve</p>
      <h4>Q: 数据来源？</h4>
      <p>A: 枚举号段下所有可能的case number并爬取USCIS, 保存成文件</p>
      <h4>Q: 没有我的号段的数据？</h4>
      <p>A: 可能需要地里大家一起来爬并更新，稍后放出步骤</p>
      <h4>Q: 为什么是文件？为什么不用数据库？</h4>
      <p>A: 穷、懒</p>
      <h4>Q: 这个很有用，可以请你喝杯咖啡吗？</h4>
      <p>A: 感谢！</p>
      <img
        src={WeChatDonation}
        alt='wechat_donation'
        style={{ width: "400px", height: "560px" }}
      />
    </div>
  );

  const formTypeSelector = (
    <FormControl fullWidth={true} component='fieldset'>
      <FormLabel component='legend'>Form Type</FormLabel>
      <RadioGroup
        aria-label='form'
        name='form'
        value={selectedForm}
        onChange={(e) => setSelectedForm(e.target.value)}
      >
        {formTypes.toArray().map((f, ind) => (
          <FormControlLabel key={ind} value={f} control={<Radio />} label={f} />
        ))}
      </RadioGroup>
    </FormControl>
  );

  const centerSelector = (
    <FormControl fullWidth={true} component='fieldset'>
      <FormLabel component='legend'>Center</FormLabel>
      <RadioGroup
        aria-label='form'
        name='form'
        value={selectedCenter}
        onChange={(e) => setSelectedCenter(e.target.value)}
      >
        {centerNames.toArray().map((f, ind) => (
          <FormControlLabel key={ind} value={f} control={<Radio />} label={f} />
        ))}
      </RadioGroup>
    </FormControl>
  );

  return (
    <div>
      {introduction}
      {updateDayPicker}
      {chart}
      {formTypeSelector}
      {centerSelector}
      {QA}
    </div>
  );
}

export default App;