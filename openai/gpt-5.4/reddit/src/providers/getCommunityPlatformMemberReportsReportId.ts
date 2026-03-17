import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const reportAuthorization =
    await MyGlobal.prisma.community_platform_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    });
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id:
          reportAuthorization.community_platform_community_id,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
        revoked_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  const report =
    await MyGlobal.prisma.community_platform_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        reason: true,
        detail: true,
        status: true,
        resolution: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        reportPost: {
          select: {
            post: CommunityPlatformPostTransformer.select(),
          },
        } satisfies Prisma.community_platform_report_postsDefaultArgs,
        reportComment: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_report_commentsDefaultArgs,
      },
    });
  if (report.reportPost !== null && report.reportComment !== null) {
    throw new HttpException("Invalid report target state", 500);
  }
  if (report.reportPost === null && report.reportComment === null) {
    throw new HttpException("Invalid report target state", 500);
  }
  return {
    id: report.id,
    reason: report.reason,
    detail: report.detail,
    status: report.status,
    resolution: report.resolution,
    reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
      report.member,
    ),
    community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
      report.community,
    ),
    reportedPost:
      report.reportPost !== null
        ? await CommunityPlatformPostTransformer.transform(
            report.reportPost.post,
          )
        : null,
    reportedComment: report.reportComment !== null ? {} : null,
    created_at: report.created_at.toISOString(),
    updated_at: report.updated_at.toISOString(),
    deleted_at: report.deleted_at?.toISOString() ?? null,
  };
}
