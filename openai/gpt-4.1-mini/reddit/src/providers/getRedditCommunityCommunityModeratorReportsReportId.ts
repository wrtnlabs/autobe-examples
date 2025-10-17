import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function getRedditCommunityCommunityModeratorReportsReportId(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });

  return {
    id: report.id,
    reporter_guest_id: report.reporter_guest_id ?? null,
    reporter_member_id: report.reporter_member_id ?? null,
    reported_post_id: report.reported_post_id ?? null,
    reported_comment_id: report.reported_comment_id ?? null,
    reported_member_id: report.reported_member_id ?? null,
    status_id: report.status_id,
    category: report.category,
    description: report.description ?? null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
