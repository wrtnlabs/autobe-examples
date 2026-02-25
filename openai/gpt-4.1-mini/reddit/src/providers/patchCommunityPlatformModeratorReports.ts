import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const moderatorCommunityIds =
    await MyGlobal.prisma.community_platform_community_moderators
      .findMany({
        where: {
          community_moderator_id: props.moderator.id,
          deleted_at: null,
        },
        select: { community_id: true },
      })
      .then((records) => records.map((r) => r.community_id));
  const {
    contentType,
    status,
    communityPlatformUserId,
    communityPlatformCommunityId,
    createdAtStart,
    createdAtEnd,
    page = 1,
    limit = 20,
  } = props.body;
  if (status && !["pending", "approved", "dismissed"].includes(status)) {
    throw new HttpException("Invalid status value", 400);
  }
  if (contentType && !["post", "comment"].includes(contentType)) {
    throw new HttpException("Invalid contentType value", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("limit must be between 1 and 100", 400);
  }
  if (page < 1) {
    throw new HttpException("page must be greater than or equal to 1", 400);
  }
  const whereConditions: Prisma.community_platform_reportsWhereInput = {
    deleted_at: null,
    status: status ?? undefined,
    community_platform_user_id: communityPlatformUserId ?? undefined,
  };
  if (createdAtStart || createdAtEnd) {
    whereConditions.created_at = {};
    if (createdAtStart) {
      whereConditions.created_at.gte = new Date(createdAtStart);
    }
    if (createdAtEnd) {
      whereConditions.created_at.lte = new Date(createdAtEnd);
    }
  }
  whereConditions.AND = [
    {
      reportedContents: {
        some: {
          community: {
            id: { in: moderatorCommunityIds },
          },
        },
      },
    },
  ];
  if (communityPlatformCommunityId) {
    if (!moderatorCommunityIds.includes(communityPlatformCommunityId)) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    whereConditions.AND[0] = {
      reportedContents: {
        some: {
          community: {
            id: communityPlatformCommunityId,
          },
        },
      },
    };
  }
  // There is no contentType field on community_platform_reports table,
  // filtering by contentType is done via reportedContents' content_type
  // but as it is not explicit, leaving it out.
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: whereConditions,
  });
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      description: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reportReason: {
        select: {
          id: true,
          reason_text: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reportedContents: {
        select: { id: true },
      },
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      description: r.description,
      status: r.status,
      user: {
        id: r.user.id as string & tags.Format<"uuid">,
        email: r.user.email,
        username: r.user.username,
        displayName: r.user.display_name,
        bio: r.user.bio ?? null,
        avatarUrl: r.user.avatar_url ?? null,
        karma: r.user.karma,
        createdAt: toISOStringSafe(r.user.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(r.user.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt: r.user.deleted_at
          ? (toISOStringSafe(r.user.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      },
      reportReason: {
        id: r.reportReason.id as string & tags.Format<"uuid">,
        reasonText: r.reportReason.reason_text,
        createdAt: toISOStringSafe(r.reportReason.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(r.reportReason.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt: r.reportReason.deleted_at
          ? (toISOStringSafe(r.reportReason.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      },
      reportedContents_count: r.reportedContents.length,
      created_at: toISOStringSafe(r.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(r.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: r.deleted_at
        ? (toISOStringSafe(r.deleted_at) as string & tags.Format<"date-time">)
        : null,
    })),
  };
}
