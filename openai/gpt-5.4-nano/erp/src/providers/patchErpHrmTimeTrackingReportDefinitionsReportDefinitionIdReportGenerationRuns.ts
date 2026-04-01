import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportGenerationRunAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingReportGenerationRunAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdReportGenerationRuns(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportGenerationRun.IRequest;
}): Promise<IErpHrmTimeTrackingReportGenerationRun.ISummary> {
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUnique({
      where: { id: props.reportDefinitionId },
      select: { id: true },
    });
  if (!reportDefinition) {
    throw new HttpException("Not Found", 404);
  }
  const parameters_summary: string =
    props.body.parametersSummary && props.body.parametersSummary.length > 0
      ? props.body.parametersSummary
      : JSON.stringify({
          reportDefinitionId: props.reportDefinitionId,
          createdAtFrom: props.body.createdAtFrom ?? null,
          createdAtTo: props.body.createdAtTo ?? null,
          startedAtFrom: props.body.startedAtFrom ?? null,
          startedAtTo: props.body.startedAtTo ?? null,
          finishedAtFrom: props.body.finishedAtFrom ?? null,
          finishedAtTo: props.body.finishedAtTo ?? null,
        });
  if (props.body.create === true) {
    const now = toISOStringSafe(new Date());
    const created =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.create(
        {
          data: {
            id: v4() as unknown as string & tags.Format<"uuid">,
            erp_hrm_time_tracking_report_definition_id:
              props.reportDefinitionId,
            parameters_summary,
            status: "pending",
            started_at: null,
            finished_at: null,
            error_message: null,
            deleted_at: null,
            created_at: now,
            updated_at: now,
          },
        },
      );
    const selected =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
        {
          where: { id: created.id },
          ...ErpHrmTimeTrackingReportGenerationRunAtSummaryTransformer.select(),
        },
      );
    return await ErpHrmTimeTrackingReportGenerationRunAtSummaryTransformer.transform(
      selected,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFrom = props.body.createdAtFrom;
  const createdAtTo = props.body.createdAtTo;
  const startedAtFrom = props.body.startedAtFrom;
  const startedAtTo = props.body.startedAtTo;
  const finishedAtFrom = props.body.finishedAtFrom;
  const finishedAtTo = props.body.finishedAtTo;
  const where: Prisma.erp_hrm_time_tracking_report_generation_runsWhereInput = {
    erp_hrm_time_tracking_report_definition_id: props.reportDefinitionId,
    deleted_at: null,
    ...(props.body.status !== undefined
      ? { status: props.body.status }
      : undefined),
    ...(createdAtFrom || createdAtTo
      ? {
          created_at: {
            ...(createdAtFrom ? { gte: createdAtFrom } : undefined),
            ...(createdAtTo ? { lte: createdAtTo } : undefined),
          },
        }
      : undefined),
    ...(startedAtFrom || startedAtTo
      ? {
          started_at: {
            ...(startedAtFrom ? { gte: startedAtFrom } : undefined),
            ...(startedAtTo ? { lte: startedAtTo } : undefined),
          },
        }
      : undefined),
    ...(finishedAtFrom || finishedAtTo
      ? {
          finished_at: {
            ...(finishedAtFrom ? { gte: finishedAtFrom } : undefined),
            ...(finishedAtTo ? { lte: finishedAtTo } : undefined),
          },
        }
      : undefined),
  };
  const orderBy =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const run =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findFirst(
      {
        where,
        skip,
        take: 1,
        orderBy,
        ...ErpHrmTimeTrackingReportGenerationRunAtSummaryTransformer.select(),
      },
    );
  if (!run) {
    throw new HttpException("Not Found", 404);
  }
  return await ErpHrmTimeTrackingReportGenerationRunAtSummaryTransformer.transform(
    run,
  );
}
