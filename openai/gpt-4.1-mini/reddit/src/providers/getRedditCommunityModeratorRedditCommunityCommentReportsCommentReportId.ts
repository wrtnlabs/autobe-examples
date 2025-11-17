import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorRedditCommunityCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentReport> {
  const record =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.commentReportId },
    });

  if (!record) {
    throw new HttpException("Comment report not found", 404);
  }

  return {
    id: record.id,
    reason: record.reason,
    created_at:
      record.created_at !== null
        ? toISOStringSafe(record.created_at)
        : ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
    updated_at:
      record.updated_at !== null
        ? toISOStringSafe(record.updated_at)
        : ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
    deleted_at:
      record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : ("1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">),
    reddit_community_comment_id: record.reddit_community_comment_id,
    reddit_community_registereduser_id:
      record.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      record.reddit_community_registereduser_session_id,
  };
}
