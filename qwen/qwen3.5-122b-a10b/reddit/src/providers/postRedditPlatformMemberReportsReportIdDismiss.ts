import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReport.IDismiss;
}): Promise<IRedditPlatformReport> {
  // 1. Find and validate report exists and is pending
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });
  if (report.deleted_at !== null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  // 2. Determine the community containing the reported content
  let communityId: string;
  if (report.post_id !== null) {
    // Report targets a post - get community from post
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: report.post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else if (report.comment_id !== null) {
    // Report targets a comment - get post from comment, then community
    const comment =
      await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
        where: { id: report.comment_id },
        select: { reddit_platform_post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: comment.reddit_platform_post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else {
    throw new HttpException("Report has no target content", 400);
  }
  // 3. Verify member is moderator of the community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: communityId,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Update report status to dismissed
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      reviewer_id: props.member.id,
      updated_at: new Date(),
    },
  });
  // 5. Fetch updated report with all relations and transform
  const updatedReport =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditPlatformReportTransformer.select(),
    });
  return await RedditPlatformReportTransformer.transform(updatedReport);
}
