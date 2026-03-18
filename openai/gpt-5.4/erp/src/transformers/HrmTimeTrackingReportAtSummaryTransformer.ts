import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingReportAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        report_type: true,
        range_start_date: true,
        range_end_date: true,
        group_by: true,
        billable_only: true,
        include_non_billable: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingReport.ISummary> {
    return {
      id: input.id,
      name: input.name,
      report_type: input.report_type,
      range_start_date: input.range_start_date?.toISOString() ?? null,
      range_end_date: input.range_end_date?.toISOString() ?? null,
      group_by: input.group_by ?? null,
      billable_only: input.billable_only ?? null,
      include_non_billable: input.include_non_billable ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
