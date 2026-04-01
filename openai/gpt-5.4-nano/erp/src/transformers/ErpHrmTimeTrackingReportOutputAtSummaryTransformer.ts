import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportOutputAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_report_outputsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        grouping_sort_key: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reportGenerationRun: true,
        employee: true,
        project: true,
        task: true,
        weekStartDate: true,
        outputMetrics: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_outputsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportOutput.ISummary> {
    return {
      id: input.id,
      report_generation_run_id: input.reportGenerationRun.id,
      employee_id: input.employee.id,
      project_id: input.project.id,
      task_id: input.task?.id ?? null,
      week_start_date_id: input.weekStartDate?.id ?? null,
      grouping_sort_key: input.grouping_sort_key,
      notes: input.notes ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
