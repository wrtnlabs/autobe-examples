import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportsDecisionCollector } from "../collectors/CommunityPlatformReportsDecisionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportsDecisionTransformer } from "../transformers/CommunityPlatformReportsDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsDecisions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReportsDecision.ICreate;
}): Promise<ICommunityPlatformReportsDecision> {
  const { admin, body } = props;
  // Validate the decision status
  if (body.status !== "approved" && body.status !== "dismissed") {
    throw new HttpException("Invalid decision status", 400);
  }
  // Fetch the report to check existence and community
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: body.reportId },
    select: { id: true, community_platform_user_id: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify admin owns the community that the report belongs to
  const adminCommunity =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_platform_user_id,
        community_moderator_id: admin.id,
      },
      select: { community_id: true },
    });
  if (!adminCommunity) {
    throw new HttpException(
      "Forbidden: Admin has no permission over this community",
      403,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Prepare create input with collector
    const data = await CommunityPlatformReportsDecisionCollector.collect({
      body,
      moderator: { id: admin.id },
    });
    // Create the decision record
    const createdDecision =
      await tx.community_platform_reports_decisions.create({
        data,
        ...CommunityPlatformReportsDecisionTransformer.select(),
      });
    if (body.status === "approved") {
      // Find reported contents
      const reportedContents =
        await tx.community_platform_reported_contents.findMany({
          where: { community_platform_report_id: body.reportId },
          select: {
            id: true,
            community_platform_report_id: true,
            community_platform_reported_post_id: true,
            community_platform_reported_comment_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
      // Delete each reported content (post or comment)
      if (reportedContents.length > 0) {
        const postIds = reportedContents
          .filter((rc) => rc.community_platform_reported_post_id !== null)
          .map((rc) => rc.community_platform_reported_post_id as string);
        if (postIds.length > 0) {
          await tx.community_platform_posts.deleteMany({
            where: { id: { in: postIds } },
          });
        }
        const commentIds = reportedContents
          .filter((rc) => rc.community_platform_reported_comment_id !== null)
          .map((rc) => rc.community_platform_reported_comment_id as string);
        if (commentIds.length > 0) {
          await tx.community_platform_post_comments.deleteMany({
            where: { id: { in: commentIds } },
          });
        }
      }
    } else if (body.status === "dismissed") {
      // Soft delete (mark report as deleted) to remove it from active list
      const now = toISOStringSafe(new Date());
      await tx.community_platform_reports.update({
        where: { id: body.reportId },
        data: { deleted_at: now },
      });
    }
    // Transform and return the created decision
    return await CommunityPlatformReportsDecisionTransformer.transform(
      createdDecision,
    );
  });
}
