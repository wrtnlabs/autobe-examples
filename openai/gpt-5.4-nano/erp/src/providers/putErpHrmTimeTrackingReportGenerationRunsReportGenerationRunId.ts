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
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportGenerationRunTransformer } from "../transformers/ErpHrmTimeTrackingReportGenerationRunTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId(props: {
  reportGenerationRunId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportGenerationRun.IUpdate;
}): Promise<IErpHrmTimeTrackingReportGenerationRun> {
  const body = props.body;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const run =
      await tx.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow({
        where: { id: props.reportGenerationRunId },
        select: {
          id: true,
          status: true,
          started_at: true,
          finished_at: true,
          error_message: true,
          deleted_at: true,
          reportDefinition: {
            select: {
              erp_hrm_time_tracking_organization_id: true,
            },
          },
        },
      });
    if (run.deleted_at !== null) {
      throw new HttpException(
        "Cannot update a deleted report generation run",
        400,
      );
    }
    const nextStatus = body.status !== undefined ? body.status : run.status;
    const nextStartedAt =
      body.started_at !== undefined ? body.started_at : run.started_at;
    const nextFinishedAt =
      body.finished_at !== undefined ? body.finished_at : run.finished_at;
    const nextErrorMessage =
      body.error_message !== undefined ? body.error_message : run.error_message;
    const isSucceeded = nextStatus === "succeeded";
    const isFailed = nextStatus === "failed";
    if (isSucceeded && nextErrorMessage !== null) {
      throw new HttpException(
        "error_message must be null when status indicates success",
        400,
      );
    }
    if (isFailed && (nextErrorMessage === null || nextErrorMessage === "")) {
      throw new HttpException(
        "error_message must be provided when status indicates failure",
        400,
      );
    }
    if (nextStartedAt !== null && nextFinishedAt !== null) {
      if (nextFinishedAt < nextStartedAt) {
        throw new HttpException(
          "finished_at must not be earlier than started_at",
          400,
        );
      }
    }
    const allowedTransitions: Record<string, string[]> = {
      pending: ["running", "succeeded", "failed"],
      running: ["succeeded", "failed"],
      succeeded: [],
      failed: [],
    };
    if (body.status !== undefined && body.status !== run.status) {
      const allowed = allowedTransitions[run.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new HttpException("Illegal status transition", 400);
      }
    }
    const data: Prisma.erp_hrm_time_tracking_report_generation_runsUpdateInput =
      {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.started_at !== undefined && {
          started_at:
            body.started_at === null
              ? null
              : new globalThis.Date(body.started_at),
        }),
        ...(body.finished_at !== undefined && {
          finished_at:
            body.finished_at === null
              ? null
              : new globalThis.Date(body.finished_at),
        }),
        ...(body.error_message !== undefined && {
          error_message: body.error_message,
        }),
      };
    await tx.erp_hrm_time_tracking_report_generation_runs.update({
      where: { id: props.reportGenerationRunId },
      data,
    });
    const updated =
      await tx.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow({
        where: { id: props.reportGenerationRunId },
        ...ErpHrmTimeTrackingReportGenerationRunTransformer.select(),
      });
    return await ErpHrmTimeTrackingReportGenerationRunTransformer.transform(
      updated,
    );
  });
}
