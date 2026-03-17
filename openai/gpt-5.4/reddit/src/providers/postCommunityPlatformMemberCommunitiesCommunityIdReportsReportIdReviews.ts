import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportReviewCollector } from "../collectors/CommunityPlatformReportReviewCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportReviewTransformer } from "../transformers/CommunityPlatformReportReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdReportsReportIdReviews(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportReview.ICreate;
}): Promise<ICommunityPlatformReportReview> {
  const normalizedAction = props.body.review_action.trim().toLowerCase();
  const approved =
    normalizedAction === "approve" || normalizedAction === "approved";
  const dismissed =
    normalizedAction === "dismiss" || normalizedAction === "dismissed";
  if (approved === false && dismissed === false) {
    throw new HttpException("Unsupported review_action", 400);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community is unavailable for moderation", 404);
  }
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    });
  if (report.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Report does not belong to the specified community",
      409,
    );
  }
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (approved === true) {
    if (report.id !== props.reportId) {
      throw new HttpException("Reported content is no longer available", 409);
    }
  }
  const created =
    await MyGlobal.prisma.community_platform_report_reviews.create({
      data: await CommunityPlatformReportReviewCollector.collect({
        body: {
          review_action: props.body.review_action,
          note: props.body.note ?? null,
        },
        report: {
          id: report.id,
        },
        moderator: {
          id: moderator.id,
        },
      }),
      ...CommunityPlatformReportReviewTransformer.select(),
    });
  return await CommunityPlatformReportReviewTransformer.transform(created);
}
