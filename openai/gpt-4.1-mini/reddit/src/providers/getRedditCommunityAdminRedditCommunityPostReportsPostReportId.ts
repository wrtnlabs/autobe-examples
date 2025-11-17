import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityPostReportsPostReportId(props: {
  admin: AdminPayload;
  postReportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostReport> {
  const report = await MyGlobal.prisma.reddit_community_post_reports.findUnique(
    {
      where: { id: props.postReportId },
    },
  );

  if (!report) {
    throw new HttpException("Post report not found", 404);
  }

  return {
    id: report.id,
    reddit_community_post_id: report.reddit_community_post_id,
    reddit_community_registereduser_id:
      report.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      report.reddit_community_registereduser_session_id,
    reason: report.reason,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
