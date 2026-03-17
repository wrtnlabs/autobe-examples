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

export async function getRedditPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  // Load the report by ID
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });
  // Determine the community from the reported content
  let communityId: string | null = null;
  if (report.post_id !== null) {
    // Load the post to get community_id
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: report.post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else if (report.comment_id !== null) {
    // Load the comment to get post, then post to get community_id
    const comment =
      await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
        where: { id: report.comment_id },
        select: { post: { select: { community_id: true } } },
      });
    communityId = comment.post.community_id;
  }
  if (communityId === null) {
    throw new HttpException("Report has no associated content", 404);
  }
  // Verify the member is a moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: communityId,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Load the full report with nested relations using transformer select
  const fullReport =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditPlatformReportTransformer.select(),
    });
  // Transform to DTO
  return await RedditPlatformReportTransformer.transform(fullReport);
}
