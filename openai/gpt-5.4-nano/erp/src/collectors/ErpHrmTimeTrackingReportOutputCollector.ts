import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingReportOutputCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportOutput.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      grouping_sort_key: props.body.grouping_sort_key,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reportGenerationRun: {
        connect: { id: props.body.report_generation_run_id },
      },
      employee: {
        connect: { id: props.body.employee_id },
      },
      project: {
        connect: { id: props.body.project_id },
      },
      task:
        props.body.task_id !== undefined && props.body.task_id !== null
          ? { connect: { id: props.body.task_id } }
          : undefined,
      weekStartDate:
        props.body.week_start_date_id !== undefined &&
        props.body.week_start_date_id !== null
          ? { connect: { id: props.body.week_start_date_id } }
          : undefined,
      outputMetrics: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_report_outputsCreateInput;
  }
}
