import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingReportDefinitionAtSummaryTransformer } from "./ErpHrmTimeTrackingReportDefinitionAtSummaryTransformer";
import { ErpHrmTimeTrackingReportOutputTransformer } from "./ErpHrmTimeTrackingReportOutputTransformer";

export namespace ErpHrmTimeTrackingReportGenerationRunTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_generation_runsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        parameters_summary: true,
        started_at: true,
        finished_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reportDefinition:
          ErpHrmTimeTrackingReportDefinitionAtSummaryTransformer.select(),
        reportOutputs: ErpHrmTimeTrackingReportOutputTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_generation_runsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportGenerationRun> {
    return {
      id: input.id,
      status: input.status,
      parameters_summary: input.parameters_summary,
      started_at: input.started_at?.toISOString() ?? null,
      finished_at: input.finished_at?.toISOString() ?? null,
      error_message: input.error_message ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      reportDefinition:
        await ErpHrmTimeTrackingReportDefinitionAtSummaryTransformer.transform(
          input.reportDefinition,
        ),
      outputs: await ArrayUtil.asyncMap(
        input.reportOutputs,
        ErpHrmTimeTrackingReportOutputTransformer.transform,
      ),
    };
  }
}
