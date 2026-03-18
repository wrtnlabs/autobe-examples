import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingReportAtSummaryTransformer } from "./HrmTimeTrackingReportAtSummaryTransformer";

export namespace HrmTimeTrackingReportEmployeeFilterTransformer {
  export type Payload =
    Prisma.hrm_time_tracking_report_employee_filtersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        report: HrmTimeTrackingReportAtSummaryTransformer.select(),
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_report_employee_filtersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingReportEmployeeFilter> {
    return {
      id: input.id,
      report: await HrmTimeTrackingReportAtSummaryTransformer.transform(
        input.report,
      ),
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    };
  }
}
