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

export async function putRedditCloneModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReport.IUpdate;
}): Promise<IRedditCloneReport> {
  // Retrieve the report and verify it exists and is in pending status
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      report_type: true,
      reddit_clone_post_id: true,
      reddit_clone_comment_id: true,
    },
  });
  // Validate report is in pending status
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 409);
  }
  // Validate the new status value
  if (
    !props.body.status ||
    !(["approved", "dismissed"] as const).includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }
  // Determine the community ID from the reported content
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
        select: {
          reddit_clone_post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: comment.reddit_clone_post_id },
      select: { reddit_clone_community_id: true },
    });
    communityId = post.reddit_clone_community_id;
  } else {
    throw new HttpException("Invalid report type", 400);
  }
  // Verify moderator has access to the community
  const moderatorAccess =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_user_profile_id: props.moderator.id,
        reddit_clone_community_id: communityId,
        deleted_at: null,
      },
    });
  if (!moderatorAccess) {
    throw new HttpException(
      "Moderator does not have access to this community",
      403,
    );
  }
  // Execute the report action in a transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update report status and handle content deletion or soft-delete
    if (props.body.status === "dismissed") {
      // Dismissed: soft-delete the report, keep content
      await tx.reddit_clone_reports.update({
        where: { id: props.reportId },
        data: {
          status: "dismissed",
          deleted_at: new Date(),
        },
      });
    } else {
      // Approved: delete the reported content
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
      await tx.reddit_clone_reports.update({
        where: { id: props.reportId },
        data: {
          status: "approved",
        },
      });
    }
    // Create report action record
    await tx.reddit_clone_report_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_clone_report_id: props.reportId,
        reddit_clone_moderator_id: props.moderator.id,
        action_type: props.body.status === "approved" ? "approve" : "dismiss",
        created_at: new Date(),
      },
    });
    // Return the updated report with all relations for transformation
    return tx.reddit_clone_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCloneReportTransformer.select(),
    });
  });
  return await RedditCloneReportTransformer.transform(updated);
}
