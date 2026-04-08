import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneModeratorReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneReport> {
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      report_type: true,
      reddit_clone_post_id: true,
      reddit_clone_comment_id: true,
      status: true,
      reportedPost: {
        select: { id: true, reddit_clone_community_id: true },
      },
      reportedComment: {
        select: {
          id: true,
          post: { select: { reddit_clone_community_id: true } },
        },
      },
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 409);
  }
  let communityId: string | null = null;
  if (report.report_type === "post" && report.reportedPost) {
    communityId = report.reportedPost.reddit_clone_community_id;
  } else if (report.report_type === "comment" && report.reportedComment) {
    communityId = report.reportedComment.post.reddit_clone_community_id;
  }
  if (communityId) {
    const moderatorAssignment =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_user_profile_id: props.moderator.id,
          reddit_clone_community_id: communityId,
          deleted_at: null,
        },
      });
    if (!moderatorAssignment) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_clone_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    });
    await tx.reddit_clone_report_actions.create({
      data: {
        id: v4(),
        reddit_clone_report_id: props.reportId,
        reddit_clone_moderator_id: props.moderator.id,
        action_type: "approve",
        created_at: new Date(),
      },
    });
    if (report.report_type === "post" && report.reddit_clone_post_id) {
      await tx.reddit_clone_posts.delete({
        where: { id: report.reddit_clone_post_id },
      });
    } else if (
      report.report_type === "comment" &&
      report.reddit_clone_comment_id
    ) {
      await tx.reddit_clone_comments.delete({
        where: { id: report.reddit_clone_comment_id },
      });
    }
  });
  const updated = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(updated);
}
