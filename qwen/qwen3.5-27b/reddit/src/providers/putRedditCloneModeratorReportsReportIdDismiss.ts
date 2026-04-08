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

export async function putRedditCloneModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneReport> {
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      report_type: true,
      status: true,
      reddit_clone_post_id: true,
      reddit_clone_comment_id: true,
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report has already been resolved", 400);
  }
  let communityId: string & tags.Format<"uuid">;
  if (report.report_type === "post" && report.reddit_clone_post_id) {
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: report.reddit_clone_post_id },
      select: { reddit_clone_community_id: true },
    });
    communityId = post.reddit_clone_community_id;
  } else if (
    report.report_type === "comment" &&
    report.reddit_clone_comment_id
  ) {
    const comment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: report.reddit_clone_comment_id },
        select: { reddit_clone_post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: comment.reddit_clone_post_id },
      select: { reddit_clone_community_id: true },
    });
    communityId = post.reddit_clone_community_id;
  } else {
    throw new HttpException(
      "Invalid report type or missing content reference",
      400,
    );
  }
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_moderators.findUniqueOrThrow({
      where: { id: props.moderator.id },
      select: { reddit_clone_user_profile_id: true },
    });
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: communityId,
        reddit_clone_user_profile_id:
          moderatorRecord.reddit_clone_user_profile_id,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: new Date(),
      deleted_at: new Date(),
    },
  });
  await MyGlobal.prisma.reddit_clone_report_actions.create({
    data: {
      id: v4(),
      reddit_clone_report_id: props.reportId,
      reddit_clone_moderator_id: props.moderator.id,
      action_type: "dismiss",
      created_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(updated);
}
