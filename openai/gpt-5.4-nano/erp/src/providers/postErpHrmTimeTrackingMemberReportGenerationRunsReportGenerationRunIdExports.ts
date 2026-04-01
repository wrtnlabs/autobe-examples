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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingReportOutputTransformer } from "../transformers/ErpHrmTimeTrackingReportOutputTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberReportGenerationRunsReportGenerationRunIdExports(props: {
  member: MemberPayload;
  reportGenerationRunId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportOutput> {
  const memberOrg =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirst({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true },
    });
  if (memberOrg === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const run =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
      {
        where: { id: props.reportGenerationRunId },
        select: {
          id: true,
          status: true,
          deleted_at: true,
        },
      },
    );
  if (run.deleted_at !== null) {
    throw new HttpException("Run is deleted", 400);
  }
  if (run.status !== "succeeded" && run.status !== "success") {
    throw new HttpException("Report generation run not successful", 400);
  }
  const firstOutput =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findFirst({
      where: {
        report_generation_run_id: props.reportGenerationRunId,
        deleted_at: null,
      },
      orderBy: { grouping_sort_key: "asc" },
      select: { id: true },
    });
  if (firstOutput === null) {
    throw new HttpException("Report outputs not found", 404);
  }
  const output =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow(
      {
        where: { id: firstOutput.id },
        ...ErpHrmTimeTrackingReportOutputTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingReportOutputTransformer.transform(output);
}
