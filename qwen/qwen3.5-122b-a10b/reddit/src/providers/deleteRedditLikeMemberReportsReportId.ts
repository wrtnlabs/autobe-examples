import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify report exists and is not already soft-deleted
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      actor_type: true,
    },
  });
  // Determine the community_id based on report type
  let communityId: string;
  if (report.actor_type === "post") {
    const reportPost =
      await MyGlobal.prisma.reddit_like_report_of_posts.findUniqueOrThrow({
        where: { reddit_like_report_id: props.reportId },
        select: { reddit_like_post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: reportPost.reddit_like_post_id },
      select: { reddit_like_community_id: true },
    });
    communityId = post.reddit_like_community_id;
  } else if (report.actor_type === "comment") {
    const reportComment =
      await MyGlobal.prisma.reddit_like_report_of_comments.findUniqueOrThrow({
        where: { reddit_like_report_id: props.reportId },
        select: { reddit_like_comment_id: true },
      });
    const comment =
      await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
        where: { id: reportComment.reddit_like_comment_id },
        select: { reddit_like_post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: comment.reddit_like_post_id },
      select: { reddit_like_community_id: true },
    });
    communityId = post.reddit_like_community_id;
  } else {
    throw new HttpException("Invalid report type", 400);
  }
  // Verify member is a moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: communityId,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft-delete the report
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: { deleted_at: new Date().toISOString() },
  });
}
