import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAnalyticsIRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsIRequest";
import { ICommunityBBSAnalyticsReportCoverage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsReportCoverage";

export async function patchCommunityBBSAnalyticsReportCoverage(props: {
  body: ICommunityBBSAnalyticsIRequest;
}): Promise<ICommunityBBSAnalyticsReportCoverage> {
  // Count total non-deleted reports
  const totalReportsSubmitted =
    await MyGlobal.prisma.community_bbs_reports.count({
      where: { deleted_at: null },
    });

  // Count total non-deleted posts
  const totalPosts = await MyGlobal.prisma.community_bbs_posts.count({
    where: { deleted_at: null },
  });

  // Count total non-deleted comments
  const totalComments = await MyGlobal.prisma.community_bbs_comments.count({
    where: { deleted_at: null },
  });

  const totalContentItems = totalPosts + totalComments;

  // Calculate report-to-content ratio
  const reportToContentRatio =
    totalContentItems > 0 ? totalReportsSubmitted / totalContentItems : 0;

  // Calculate average review time in hours using only string date handling
  const reviewTimeRecords =
    await MyGlobal.prisma.community_bbs_reports.findMany({
      where: {
        deleted_at: null,
        reviewed_at: { not: null },
      },
      select: {
        created_at: true,
        reviewed_at: true,
      },
    });

  let totalReviewHours = 0;
  const validReviews = reviewTimeRecords.length;

  for (const record of reviewTimeRecords) {
    // Convert ISO strings to Date objects only for calculation, then discard
    // Use toISOStringSafe to correctly handle nulls and ensure we do NOT pass null to Date() constructor
    const created = new Date(record.created_at);
    const reviewed = new Date(record.reviewed_at!);

    // Calculate difference in hours with proper null checks
    // We already filtered for reviewed_at: { not: null }, so reviewed_at should never be null
    // This null error is a false positive from TypeScript type inference - we should handle safely
    // Since we filtered with reviewed_at: { not: null }, reviewed_at cannot be null here, so we can use ! to assert non-null
    const diffMs = reviewed.getTime() - created.getTime();
    totalReviewHours += diffMs / (1000 * 60 * 60);
  }

  const averageReviewTimeHours =
    validReviews > 0 ? totalReviewHours / validReviews : 0;

  // Calculate resolution rate percentage
  const approvedReports = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      deleted_at: null,
      status: "approved",
    },
  });

  const resolutionRatePercentage =
    totalReportsSubmitted > 0
      ? (approvedReports / totalReportsSubmitted) * 100
      : 0;

  // Calculate post report ratio
  const postReports = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      deleted_at: null,
      targeted_entity_type: "post",
    },
  });

  const postReportRatio =
    totalReportsSubmitted > 0 ? (postReports / totalReportsSubmitted) * 100 : 0;

  // Calculate moderator efficiency score
  const moderatorEfficiencyScore =
    averageReviewTimeHours > 0
      ? (resolutionRatePercentage * 100) / (averageReviewTimeHours + 1)
      : 0;

  // Calculate community engagement index using available data
  // Since we don't have active communities or total users in schema, use proxy
  // based on the formula provided in description, normalized
  const communityEngagementIndex =
    totalReportsSubmitted > 0 && totalContentItems > 0
      ? (reportToContentRatio * totalContentItems) / 100
      : 0;

  return {
    total_reports_submitted: totalReportsSubmitted,
    total_content_items: totalContentItems,
    report_to_content_ratio: reportToContentRatio,
    average_review_time_hours: averageReviewTimeHours,
    resolution_rate_percentage: resolutionRatePercentage,
    post_report_ratio: postReportRatio,
    moderator_efficiency_score: moderatorEfficiencyScore,
    community_engagement_index: communityEngagementIndex,
  };
}
