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

export async function putRedditCommunityModeratorRedditCommunityCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.IUpdate;
}): Promise<IRedditCommunityCommentReport> {
  const existing =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.commentReportId },
    });
  if (!existing) {
    throw new HttpException("Comment report not found", 404);
  }

  const updated = await MyGlobal.prisma.reddit_community_comment_reports.update(
    {
      where: { id: props.commentReportId },
      data: {
        reason: props.body.reason,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    reason: updated.reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
    reddit_community_comment_id: updated.reddit_community_comment_id,
    reddit_community_registereduser_id:
      updated.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      updated.reddit_community_registereduser_session_id,
  };
}
