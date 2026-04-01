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
  const { reportGenerationRunId, body } = props;
  const current =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
      {
        where: { id: reportGenerationRunId },
        ...ErpHrmTimeTrackingReportGenerationRunTransformer.select(),
      },
    );
  if (current.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const nextStatus = body.status !== undefined ? body.status : current.status;
  const nextStartedAt =
    body.started_at !== undefined ? body.started_at : current.started_at;
  const nextFinishedAt =
    body.finished_at !== undefined ? body.finished_at : current.finished_at;
  const nextErrorMessage =
    body.error_message !== undefined
      ? body.error_message
      : current.error_message;
  if (nextStartedAt !== null && nextFinishedAt !== null) {
    if (nextFinishedAt < nextStartedAt) {
      throw new HttpException(
        "finished_at must not be earlier than started_at",
        400,
      );
    }
  }
  const statusLower = nextStatus.toLowerCase();
  const indicatesFailure =
    statusLower.includes("fail") ||
    statusLower.includes("error") ||
    statusLower.includes("rejected");
  const indicatesSuccess =
    statusLower.includes("succ") ||
    statusLower.includes("success") ||
    statusLower.includes("complete");
  if (indicatesFailure) {
    if (nextErrorMessage === null || nextErrorMessage.trim().length === 0) {
      throw new HttpException(
        "error_message is required for failed status",
        400,
      );
    }
  }
  if (indicatesSuccess) {
    if (nextErrorMessage !== null) {
      throw new HttpException(
        "error_message must be null for successful status",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_report_generation_runs.update({
      where: { id: reportGenerationRunId },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.started_at !== undefined && { started_at: body.started_at }),
        ...(body.finished_at !== undefined && {
          finished_at: body.finished_at,
        }),
        ...(body.error_message !== undefined && {
          error_message: body.error_message,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
      {
        where: { id: reportGenerationRunId },
        ...ErpHrmTimeTrackingReportGenerationRunTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingReportGenerationRunTransformer.transform(
    updated,
  );
}
