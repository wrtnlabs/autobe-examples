import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportOutputAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_report_outputsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_generation_run_id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        week_start_date_id: true,
        grouping_sort_key: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        outputMetrics: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_outputsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportOutput.ISummary> {
    return {
      id: input.id,
      report_generation_run_id: input.report_generation_run_id,
      employee_id: input.employee_id,
      project_id: input.project_id,
      task_id: input.task_id ?? null,
      week_start_date_id: input.week_start_date_id ?? null,
      grouping_sort_key: input.grouping_sort_key,
      notes: input.notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
