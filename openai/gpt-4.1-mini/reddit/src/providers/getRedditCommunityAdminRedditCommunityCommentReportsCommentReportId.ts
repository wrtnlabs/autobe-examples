import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityCommentReportsCommentReportId(props: {
  admin: AdminPayload;
  commentReportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const record =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.commentReportId },
    });

  if (record === null) {
    throw new HttpException("Comment report not found", 404);
  }

  return {
    id: record.id,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    reddit_community_comment_id: record.reddit_community_comment_id,
    reddit_community_registereduser_id:
      record.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      record.reddit_community_registereduser_session_id,
  };
}
