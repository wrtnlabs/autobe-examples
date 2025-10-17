import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  // Step 1: Fetch report
  const prev = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!prev) throw new HttpException("Report not found", 404);

  // Step 2: Status transition rules (resolved/dismissed can't revert to pending/under_review)
  const closedStates = ["resolved", "dismissed"];
  if (
    closedStates.includes(prev.status) &&
    !closedStates.includes(props.body.status)
  ) {
    throw new HttpException(
      "Cannot revert a closed report to a non-closed state",
      400,
    );
  }

  // Step 3: Update - only allowed fields and updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      moderation_result: props.body.moderation_result,
      moderated_by_id: props.body.moderated_by_id,
      updated_at: now,
    },
  });

  // Step 4: Return typed response: Map all fields explicitly, handle null/undefined strictly
  return {
    id: updated.id,
    reporting_member_id: updated.reporting_member_id,
    post_id:
      typeof updated.post_id === "undefined"
        ? undefined
        : updated.post_id === null
          ? null
          : updated.post_id,
    comment_id:
      typeof updated.comment_id === "undefined"
        ? undefined
        : updated.comment_id === null
          ? null
          : updated.comment_id,
    report_category_id: updated.report_category_id,
    reason_text:
      typeof updated.reason_text === "undefined"
        ? undefined
        : updated.reason_text === null
          ? null
          : updated.reason_text,
    status: updated.status,
    moderation_result:
      typeof updated.moderation_result === "undefined"
        ? undefined
        : updated.moderation_result === null
          ? null
          : updated.moderation_result,
    moderated_by_id:
      typeof updated.moderated_by_id === "undefined"
        ? undefined
        : updated.moderated_by_id === null
          ? null
          : updated.moderated_by_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
