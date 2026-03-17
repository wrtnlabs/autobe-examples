import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneReportActionCollector } from "../collectors/RedditCloneReportActionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportActionTransformer } from "../transformers/RedditCloneReportActionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdReportsReportIdActions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneReportAction.ICreate;
}): Promise<IRedditCloneReportAction> {
  // Step 1: Verify user is a moderator in the community
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  // Step 2: Verify report exists and belongs to this community, include target relations
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      target_type: true,
      reportOfPost: {
        select: {
          reddit_clone_post_id: true,
        },
      },
      commentReport: {
        select: {
          comment_id: true,
        },
      },
    },
  });
  if (report.community_id !== props.communityId) {
    throw new HttpException("Report does not belong to this community", 400);
  }
  // Step 3: Check no existing action exists for this report
  const existingAction =
    await MyGlobal.prisma.reddit_clone_report_actions.findUnique({
      where: {
        reddit_clone_report_id: props.reportId,
      },
    });
  if (existingAction) {
    throw new HttpException("Action already exists for this report", 409);
  }
  // Step 4: Create the action record using Collector
  const action = await MyGlobal.prisma.reddit_clone_report_actions.create({
    data: await RedditCloneReportActionCollector.collect({
      body: props.body,
      redditCloneReports: { id: props.reportId },
      redditCloneModerators: { id: moderator.id },
    }),
    ...RedditCloneReportActionTransformer.select(),
  });
  // Step 5: If APPROVE, soft-delete the reported content
  if (props.body.action === "APPROVE") {
    if (report.target_type === "POST" && report.reportOfPost) {
      await MyGlobal.prisma.reddit_clone_posts.update({
        where: { id: report.reportOfPost.reddit_clone_post_id },
        data: {
          deleted_at: new Date(),
        },
      });
    } else if (report.target_type === "COMMENT" && report.commentReport) {
      await MyGlobal.prisma.reddit_clone_comments.update({
        where: { id: report.commentReport.comment_id },
        data: {
          deleted_at: new Date(),
        },
      });
    }
  }
  // Step 6: Update report status
  await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      review_status: props.body.action === "APPROVE" ? "APPROVED" : "DISMISSED",
      deleted_at: props.body.action === "DISMISS" ? new Date() : null,
    },
  });
  // Step 7: Return the created action
  return await RedditCloneReportActionTransformer.transform(action);
}
