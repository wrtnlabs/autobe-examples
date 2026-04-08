import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  if (report.status !== "pending") {
    throw new HttpException("Report has already been resolved", 400);
  }
  let contentId: string;
  let communityId: string;
  if (report.report_type === "post") {
    if (!report.reportOfPost) {
      throw new HttpException("Report target not found", 404);
    }
    contentId = report.reportOfPost.post.id;
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: contentId },
        select: { reddit_community_community_id: true },
      },
    );
    communityId = post.reddit_community_community_id;
  } else {
    if (!report.reportOfComment) {
      throw new HttpException("Report target not found", 404);
    }
    contentId = report.reportOfComment.comment.id;
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
        where: { id: contentId },
        select: { reddit_community_post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: comment.reddit_community_post_id },
        select: { reddit_community_community_id: true },
      },
    );
    communityId = post.reddit_community_community_id;
  }
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: communityId,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }
  if (report.report_type === "post") {
    await MyGlobal.prisma.reddit_community_posts.update({
      where: { id: contentId },
      data: {
        deleted_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: contentId },
      data: {
        deleted_at: new Date(),
      },
    });
  }
  await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      resolved_by_id: props.member.id,
      resolved_at: new Date(),
    },
  });
  const updatedReport =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  return await RedditCommunityReportTransformer.transform(updatedReport);
}
