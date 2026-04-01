import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer";
import { ErpHrmTimeTrackingReportOutputTransformer } from "../transformers/ErpHrmTimeTrackingReportOutputTransformer";
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingReportOutputsReportOutputId(props: {
  reportOutputId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportOutput> {
  const output =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow(
      {
        where: { id: props.reportOutputId },
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
            select: {
              id: true,
              metric_name: true,
              metric_value: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              reportOutput: false,
            },
          },
          reportGenerationRun: {
            select: {
              reportDefinition: {
                select: {
                  erp_hrm_time_tracking_organization_id: true,
                },
              },
            },
          },
        },
      },
    );
  // organization context and permission checks would go here
  return await ErpHrmTimeTrackingReportOutputTransformer.transform(
    output as any,
  );
}
