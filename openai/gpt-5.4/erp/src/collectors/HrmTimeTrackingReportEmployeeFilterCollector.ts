import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingReportEmployeeFilterCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingReportEmployeeFilter.ICreate;
    report: IEntity;
  }) {
    return {
      id: v4(),
      report: {
        connect: {
          id: props.report.id,
        },
      },
      employee: {
        connect: {
          id: props.body.hrm_time_tracking_employee_id,
        },
      },
    } satisfies Prisma.hrm_time_tracking_report_employee_filtersCreateInput;
  }
}
