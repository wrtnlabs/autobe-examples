import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find report with reporter, post, and comment relations
  const report = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
      reporter_id: true,
      reported_post_id: true,
      reported_comment_id: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // Determine community ID based on what's being reported
  let communityId: string;
  if (report.reported_post_id !== null) {
    // Reporting a post - get community from the post
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: report.reported_post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else if (report.reported_comment_id !== null) {
    // Reporting a comment - get community from the post the comment belongs to
    const comment =
      await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
        where: { id: report.reported_comment_id },
        select: { post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: comment.post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else {
    // Neither post nor comment - invalid report state
    throw new HttpException("Invalid report state", 500);
  }
  // Verify moderator has permission for this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: communityId,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException(
      "Forbidden - not authorized for this community",
      403,
    );
  }
  // Perform soft delete - set deleted_at timestamp
  const now = new Date();
  const nowString = toISOStringSafe(now);
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      deleted_at: nowString,
    },
  });
}
