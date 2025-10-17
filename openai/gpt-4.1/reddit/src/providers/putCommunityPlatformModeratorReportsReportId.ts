import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  // Step 1: Fetch the report, or throw 404
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });

  // Step 2: Update the report status/result
  const updated = await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      moderation_result: props.body.moderation_result,
      moderated_by_id: props.body.moderated_by_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 3: Return result as ICommunityPlatformReport (date fields as ISO string, handle null/undefined for optional)
  return {
    id: updated.id,
    reporting_member_id: updated.reporting_member_id,
    post_id:
      updated.post_id === undefined
        ? undefined
        : (updated.post_id ?? undefined),
    comment_id:
      updated.comment_id === undefined
        ? undefined
        : (updated.comment_id ?? undefined),
    report_category_id: updated.report_category_id,
    reason_text:
      updated.reason_text === undefined
        ? undefined
        : (updated.reason_text ?? undefined),
    status: updated.status,
    moderation_result:
      updated.moderation_result === undefined
        ? undefined
        : (updated.moderation_result ?? undefined),
    moderated_by_id:
      updated.moderated_by_id === undefined
        ? undefined
        : (updated.moderated_by_id ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
