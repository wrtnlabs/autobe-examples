import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReportsStatistics(props: {
  member: MemberPayload;
  body: ICommunityPlatformContentReport.IRequest;
}): Promise<IPageICommunityPlatformContentReport.ISummary> {
  // 1. Check if member has moderation privileges
  const moderationRoles =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_platform_community_id: true,
      },
    });
  if (moderationRoles.length === 0) {
    throw new HttpException(
      "You don't have moderation privileges in any community",
      403,
    );
  }
  const moderatedCommunityIds = moderationRoles.map(
    (role) => role.community_platform_community_id,
  );
  // 2. Build WHERE clause
  const whereClause: Prisma.community_platform_content_reportsWhereInput = {
    deleted_at: null,
    community_id: {
      in: moderatedCommunityIds,
    },
  };
  // Apply status filter if provided
  if (props.body.status && props.body.status.length > 0) {
    whereClause.status = {
      in: props.body.status,
    };
  }
  // Apply community filter if provided
  if (props.body.community_id) {
    if (!moderatedCommunityIds.includes(props.body.community_id)) {
      throw new HttpException(
        "You don't have moderation privileges in that community",
        403,
      );
    }
    whereClause.community_id = props.body.community_id;
  }
  // Apply reporter filter if provided
  if (props.body.reporter_member_id) {
    whereClause.reporter_member_id = props.body.reporter_member_id;
  }
  // Apply date filters
  if (props.body.created_after) {
    whereClause.created_at = {
      gte: new Date(props.body.created_after),
    };
  }
  if (props.body.created_before) {
    whereClause.created_at = {
      ...(whereClause.created_at as Prisma.DateTimeFilter),
      lte: new Date(props.body.created_before),
    };
  }
  // Apply search filter on reason field
  if (props.body.search) {
    whereClause.reason = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Apply content type filter
  if (props.body.content_type === "post") {
    whereClause.postReport = {
      isNot: null,
    };
  } else if (props.body.content_type === "comment") {
    whereClause.commentReport = {
      isNot: null,
    };
  }
  // Pagination
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = Math.min(
    props.body.limit ?? 20,
    100,
  ) satisfies number as number;
  const skip = (page - 1) * limit;
  // 3. Query the database with pagination
  const reports =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where: whereClause,
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporterMember: {
          select: {
            id: true,
            email: true,
            username: true,
            email_verified: true,
            registered_at: true,
            nickname: true,
            last_login_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            ownerMember: {
              select: {
                id: true,
                email: true,
                username: true,
                email_verified: true,
                registered_at: true,
                nickname: true,
                last_login_at: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  const total = await MyGlobal.prisma.community_platform_content_reports.count({
    where: whereClause,
  });
  // 4. Transform to DTO format
  const data = reports.map((report) => {
    const reporterSummary: ICommunityPlatformMember.ISummary = {
      id: report.reporterMember.id,
      email: report.reporterMember.email satisfies string as string,
      username: report.reporterMember.username,
      nickname: report.reporterMember.nickname,
      email_verified: report.reporterMember.email_verified,
      registered_at: report.reporterMember.registered_at.toISOString(),
      last_login_at: report.reporterMember.last_login_at?.toISOString() ?? null,
    };
    // Need subscriber count - fetch from materialized view if available
    const communitySummary: ICommunityPlatformCommunity.ISummary = {
      id: report.community.id,
      name: report.community.name,
      description: report.community.description,
      created_at: report.community.created_at.toISOString(),
      owner: {
        id: report.community.ownerMember.id,
        email: report.community.ownerMember.email satisfies string as string,
        username: report.community.ownerMember.username,
        nickname: report.community.ownerMember.nickname,
        email_verified: report.community.ownerMember.email_verified,
        registered_at: report.community.ownerMember.registered_at.toISOString(),
        last_login_at:
          report.community.ownerMember.last_login_at?.toISOString() ?? null,
      },
      subscriber_count: 0 satisfies number as number, // Would need actual query
    };
    const summary: ICommunityPlatformContentReport.ISummary = {
      id: report.id,
      reason: report.reason,
      status: report.status,
      created_at: report.created_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
      deleted_at: report.deleted_at?.toISOString() ?? null,
      reporter: reporterSummary,
      community: communitySummary,
    };
    return summary;
  });
  // 5. Return the page structure
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination as IPage.IPagination,
    data,
  } satisfies IPageICommunityPlatformContentReport.ISummary as IPageICommunityPlatformContentReport.ISummary;
}
