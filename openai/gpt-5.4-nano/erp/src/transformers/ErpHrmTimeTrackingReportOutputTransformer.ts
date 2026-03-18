import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer } from "./ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer";
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "./ErpHrmTimeTrackingTaskAtSummaryTransformer";

export namespace ErpHrmTimeTrackingReportOutputTransformer {
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
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
        weekStartDate:
          ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer.select(),
        outputMetrics: {
          select: { id: true },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_outputsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportOutput> {
    return {
      id: input.id,
      reportGenerationRunId: input.report_generation_run_id,
      employeeId: input.employee_id,
      projectId: input.project_id,
      taskId: input.task_id ?? null,
      weekStartDateId: input.week_start_date_id ?? null,
      groupingSortKey: input.grouping_sort_key,
      notes: input.notes ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      employee: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await ErpHrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
      weekStartDate: input.weekStartDate
        ? await ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer.transform(
            input.weekStartDate,
          )
        : null,
    };
  }
}
