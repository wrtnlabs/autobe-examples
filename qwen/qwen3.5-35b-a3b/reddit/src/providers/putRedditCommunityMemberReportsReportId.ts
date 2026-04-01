import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  // Validate that status is provided
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  // Get the report and verify it exists and is pending
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        reporter_id: true,
        community_id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Validate status is pending
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  // Verify the member is a moderator of the community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        reddit_community_community_id: report.community_id,
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Execute transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update report status
    const updatedReport = await tx.reddit_community_reports.update({
      where: { id: props.reportId },
      data: {
        status: props.body.status,
        updated_at: new Date(),
      },
      select: {
        id: true,
        reporter_id: true,
        community_id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    // Create audit action record
    const now = new Date();
    await tx.reddit_community_report_actions.create({
      data: {
        id: v4(),
        reddit_community_report_id: props.reportId,
        moderator_id: moderator.id,
        action_type: props.body.status as string,
        notes: props.body.notes ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Handle content deletion based on status and target type
    if (props.body.status === "approved") {
      if (updatedReport.target_type === "post") {
        // Hard delete post (cascade deletes post_texts, post_links, post_files)
        await tx.reddit_community_posts.delete({
          where: { id: updatedReport.target_id },
        });
      } else if (updatedReport.target_type === "comment") {
        // Soft delete comment
        await tx.reddit_community_comments.update({
          where: { id: updatedReport.target_id },
          data: {
            deleted_at: now,
            updated_at: now,
          },
        });
      }
    }
    return updatedReport;
  });
  // Load reporter and community relations for complete response
  const [reporter, community] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: updated.reporter_id },
      select: RedditCommunityMemberAtSummaryTransformer.select().select,
    }),
    MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: updated.community_id },
      select: RedditCommunityCommunityAtSummaryTransformer.select().select,
    }),
  ]);
  if (reporter === null || community === null) {
    throw new HttpException("Related data not found", 500);
  }
  const [transformedReporter, transformedCommunity] = await Promise.all([
    RedditCommunityMemberAtSummaryTransformer.transform(reporter),
    RedditCommunityCommunityAtSummaryTransformer.transform(community),
  ]);
  return {
    id: updated.id,
    reporter: transformedReporter,
    community: transformedCommunity,
    target_type: updated.target_type as "post" | "comment",
    target_id: updated.target_id,
    reason: updated.reason,
    status: updated.status as "pending" | "approved" | "dismissed",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies IRedditCommunityReport;
}
