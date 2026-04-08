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

export async function postRedditCommunityMemberCommunitiesCommunityIdReportsReportIdDismiss(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  // 1. Verify moderator status
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
  // 2. Load report and verify it's pending, also get community association
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        report_type: true,
        reportOfPost: {
          select: {
            post: {
              select: {
                reddit_community_community_id: true,
              },
            },
          },
        },
        reportOfComment: {
          select: {
            comment: {
              select: {
                reddit_community_post_id: true,
              },
            },
          },
        },
      },
    });
  // 3. Verify report is pending
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 400);
  }
  // 4. Verify report belongs to the specified community
  let reportCommunityId: string | undefined;
  if (report.report_type === "post") {
    reportCommunityId = report.reportOfPost?.post.reddit_community_community_id;
  } else if (report.reportOfComment) {
    const commentPost =
      await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
        where: { id: report.reportOfComment.comment.reddit_community_post_id },
        select: { reddit_community_community_id: true },
      });
    reportCommunityId = commentPost.reddit_community_community_id;
  }
  if (reportCommunityId !== props.communityId) {
    throw new HttpException("Report does not belong to this community", 400);
  }
  // 5. Update report status to dismissed
  await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      resolved_by_id: props.member.id,
      resolved_at: new Date(),
    },
  });
  // 6. Return updated report
  const updated =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  return await RedditCommunityReportTransformer.transform(updated);
}
