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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdReportGenerationRuns(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportGenerationRun.IRequest;
}): Promise<IErpHrmTimeTrackingReportGenerationRun.ISummary> {
  const definition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: {
          id: true,
          erp_hrm_time_tracking_organization_id: true,
        },
      },
    );
  const isCreate = props.body.create === true;
  if (!isCreate) {
    throw new HttpException("Unsupported operation", 400);
  }
  const parametersSummary =
    props.body.parametersSummary !== undefined &&
    props.body.parametersSummary !== ""
      ? props.body.parametersSummary
      : JSON.stringify({
          status: props.body.status,
          createdAtFrom: props.body.createdAtFrom,
          createdAtTo: props.body.createdAtTo,
          startedAtFrom: props.body.startedAtFrom,
          startedAtTo: props.body.startedAtTo,
          finishedAtFrom: props.body.finishedAtFrom,
          finishedAtTo: props.body.finishedAtTo,
          sort: props.body.sort,
        });
  const run =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.create({
      data: {
        id: v4(),
        erp_hrm_time_tracking_report_definition_id: props.reportDefinitionId,
        parameters_summary: parametersSummary,
        status: "pending",
        started_at: null,
        finished_at: null,
        error_message: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
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
        reportDefinition: undefined,
      },
    });
  return run as unknown as IErpHrmTimeTrackingReportGenerationRun.ISummary;
}
