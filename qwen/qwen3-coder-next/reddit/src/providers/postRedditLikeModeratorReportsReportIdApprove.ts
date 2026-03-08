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

export async function postRedditLikeModeratorReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the report with its related content information
  const report = await MyGlobal.prisma.reddit_like_reports.findUnique({
    where: { id: props.reportId },
    select: {
      reported_post_id: true,
      reported_comment_id: true,
      reporter_id: true,
      status: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify report is still pending (not already processed)
  if (report.status !== "pending") {
    throw new HttpException("Report has already been processed", 409);
  }
  // Determine the community ID based on reported content
  let communityId: string | null = null;
  if (report.reported_post_id) {
    const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
      where: { id: report.reported_post_id },
      select: { community_id: true },
    });
    if (post) communityId = post.community_id;
  } else if (report.reported_comment_id) {
    const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
      where: { id: report.reported_comment_id },
      select: { post: { select: { community_id: true } } },
    });
    if (comment?.post) communityId = comment.post.community_id;
  }
  // Verify moderator has authority for the community
  if (communityId) {
    const moderatorRole =
      await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
        where: {
          user_id: props.moderator.id,
          community_id: communityId,
          role: { in: ["moderator", "owner"] },
        },
      });
    if (!moderatorRole) {
      throw new HttpException(
        "Forbidden: Not authorized for this community",
        403,
      );
    }
  }
  // Delete the reported content (post or comment)
  if (report.reported_post_id) {
    await MyGlobal.prisma.reddit_like_posts.delete({
      where: { id: report.reported_post_id },
    });
  } else if (report.reported_comment_id) {
    await MyGlobal.prisma.reddit_like_comments.delete({
      where: { id: report.reported_comment_id },
    });
  }
  // Update the report status to 'approved'
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
