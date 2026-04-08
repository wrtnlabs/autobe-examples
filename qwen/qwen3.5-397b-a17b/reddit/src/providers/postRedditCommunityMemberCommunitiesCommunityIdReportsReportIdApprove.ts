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

export async function postRedditCommunityMemberCommunitiesCommunityIdReportsReportIdApprove(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: props.communityId,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 400);
  }
  if (report.report_type === "post") {
    const reportOfPost =
      await MyGlobal.prisma.reddit_community_report_of_posts.findUniqueOrThrow({
        where: { reddit_community_report_id: props.reportId },
      });
    await MyGlobal.prisma.reddit_community_posts.delete({
      where: { id: reportOfPost.reddit_community_post_id },
    });
  } else {
    const reportOfComment =
      await MyGlobal.prisma.reddit_community_report_of_comments.findUniqueOrThrow(
        {
          where: { reddit_community_report_id: props.reportId },
        },
      );
    await MyGlobal.prisma.reddit_community_comments.delete({
      where: { id: reportOfComment.reddit_community_comment_id },
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
  const updated =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  return await RedditCommunityReportTransformer.transform(updated);
}
