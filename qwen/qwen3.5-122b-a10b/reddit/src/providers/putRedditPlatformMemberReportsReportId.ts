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

export async function putRedditPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReport.IUpdate;
}): Promise<IRedditPlatformReport> {
  // 1. Retrieve report and validate exists
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (report === null || report.deleted_at !== null) {
    throw new HttpException("Report not found", 404);
  }
  // 2. Validate report is still pending (not already resolved)
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 400);
  }
  // 3. Validate status value
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "dismissed") {
    throw new HttpException("Invalid status value", 400);
  }
  // 4. Determine target community from reported content
  let communityId: string;
  if (report.post_id !== null) {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.post_id },
      select: { community_id: true, deleted_at: true },
    });
    if (post === null || post.deleted_at !== null) {
      throw new HttpException("Reported content not found", 404);
    }
    communityId = post.community_id;
  } else if (report.comment_id !== null) {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: report.comment_id },
      select: { reddit_platform_post_id: true, deleted_at: true },
    });
    if (comment === null || comment.deleted_at !== null) {
      throw new HttpException("Reported content not found", 404);
    }
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: comment.reddit_platform_post_id },
      select: { community_id: true, deleted_at: true },
    });
    if (post === null || post.deleted_at !== null) {
      throw new HttpException("Reported content not found", 404);
    }
    communityId = post.community_id;
  } else {
    throw new HttpException("Reported content not found", 404);
  }
  // 5. Verify member has moderator role for the community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: communityId,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Moderator access required", 403);
  }
  // 6. Execute status update
  const now = new Date();
  await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      reviewer_id: props.member.id,
      updated_at: now,
    },
  });
  // 7. If approved, delete the reported content
  if (props.body.status === "approved") {
    if (report.post_id !== null) {
      await MyGlobal.prisma.reddit_platform_posts.delete({
        where: { id: report.post_id },
      });
    } else if (report.comment_id !== null) {
      await MyGlobal.prisma.reddit_platform_comments.delete({
        where: { id: report.comment_id },
      });
    }
  }
  // 8. Return updated report
  const updated =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditPlatformReportTransformer.select(),
    });
  return await RedditPlatformReportTransformer.transform(updated);
}
