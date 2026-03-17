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
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  // Validate update is provided
  if (props.body.status === undefined) {
    throw new HttpException("Status update is required", 400);
  }
  // Validate status value
  const statusValue: "approved" | "dismissed" = props.body.status;
  // Query existing report
  const report =
    await MyGlobal.prisma.reddit_community_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
      },
      select: {
        id: true,
        community_id: true,
        status: true,
        target_type: true,
        target_id: true,
      },
    });
  // Validate current status is pending
  if (report.status !== "pending") {
    throw new HttpException("Report must be pending", 400);
  }
  // Verify moderator authorization
  const moderatorCheck =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community: { id: report.community_id },
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!moderatorCheck) {
    throw new HttpException("Forbidden", 403);
  }
  // Execute transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update report
    const updatedReport = await tx.reddit_community_reports.update({
      where: { id: props.reportId },
      data: {
        status: statusValue,
        updated_at: new Date(),
      },
    });
    // Create audit record
    await tx.reddit_community_report_actions.create({
      data: {
        id: v4(),
        report: { connect: { id: props.reportId } },
        moderator: { connect: { id: props.member.id } },
        action_type: statusValue,
        notes: props.body.notes ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Handle content deletion
    if (statusValue === "approved") {
      if (report.target_type === "post") {
        await tx.reddit_community_posts.delete({
          where: { id: report.target_id },
        });
      } else if (report.target_type === "comment") {
        await tx.reddit_community_comments.update({
          where: { id: report.target_id },
          data: { deleted_at: new Date() },
        });
      }
    }
    return updatedReport;
  });
  // Query with relations for response
  const finalReport =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCommunityReportTransformer.select(),
    });
  return await RedditCommunityReportTransformer.transform(finalReport);
}
