import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingReportTaskFilterCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingReportTaskFilter.ICreate;
    hrmTimeTrackingReports: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report: {
        connect: {
          id: props.hrmTimeTrackingReports.id,
        },
      },
      task: {
        connect: {
          id: props.body.task_id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_report_task_filtersCreateInput;
  }
}
