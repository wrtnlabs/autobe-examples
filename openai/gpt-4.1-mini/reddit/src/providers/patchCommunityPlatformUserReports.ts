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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserReports(props: {
  user: UserPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
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
  const validStatusValues = ["pending", "approved", "dismissed"] as const;
  if (status !== undefined && !validStatusValues.includes(status)) {
    throw new HttpException("Invalid status value", 400);
  }
  const validContentTypes = ["post", "comment"] as const;
  if (contentType !== undefined && !validContentTypes.includes(contentType)) {
    throw new HttpException("Invalid contentType value", 400);
  }
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit =
    Number.isInteger(limit) && limit >= 1 && limit <= 100 ? limit : 20;
  const userModeratedCommunities =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: { community_moderator_id: props.user.id, deleted_at: null },
      select: { community_id: true },
    });
  const moderatedCommunityIds = userModeratedCommunities.map(
    ({ community_id }) => community_id,
  );
  if (moderatedCommunityIds.length === 0) {
    return {
      pagination: {
        current: safePage,
        limit: safeLimit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const andConditions: Prisma.community_platform_reportsWhereInput[] = [];
  if (status !== undefined) andConditions.push({ status });
  if (communityPlatformUserId !== undefined)
    andConditions.push({ community_platform_user_id: communityPlatformUserId });
  if (createdAtStart !== undefined && createdAtStart !== null)
    andConditions.push({ created_at: { gte: createdAtStart } });
  if (createdAtEnd !== undefined && createdAtEnd !== null)
    andConditions.push({ created_at: { lte: createdAtEnd } });
  if (communityPlatformCommunityId !== undefined) {
    andConditions.push({
      reportedContents: {
        some: {
          deleted_at: null,
          OR: [
            {
              reportedPost: {
                community_id: communityPlatformCommunityId,
                deleted_at: null,
              },
            },
            {
              reportedComment: {
                post: {
                  community_id: communityPlatformCommunityId,
                  deleted_at: null,
                },
                deleted_at: null,
              },
            },
          ],
        },
      },
    });
  }
  andConditions.push({
    reportedContents: {
      some: {
        deleted_at: null,
        OR: [
          {
            reportedPost: {
              community_id: { in: moderatedCommunityIds },
              deleted_at: null,
            },
          },
          {
            reportedComment: {
              post: {
                community_id: { in: moderatedCommunityIds },
                deleted_at: null,
              },
              deleted_at: null,
            },
          },
        ],
      },
    },
  });
  if (contentType !== undefined) {
    if (contentType === "post")
      andConditions.push({
        reportedContents: {
          some: {
            community_platform_reported_comment_id: null,
            deleted_at: null,
          },
        },
      });
    if (contentType === "comment")
      andConditions.push({
        reportedContents: {
          some: { community_platform_reported_post_id: null, deleted_at: null },
        },
      });
  }
  const where: Prisma.community_platform_reportsWhereInput = {
    AND: andConditions,
  };
  const skip = (safePage - 1) * safeLimit;
  const [total, reports] = await Promise.all([
    MyGlobal.prisma.community_platform_reports.count({ where }),
    MyGlobal.prisma.community_platform_reports.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: safeLimit,
      select: {
        id: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
        reportedContents: { select: { id: true } },
      },
    }),
  ]);
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: total > 0 ? Math.ceil(total / safeLimit) : 0,
    },
    data: reports.map((r) => ({
      id: r.id,
      description: r.description,
      status: r.status,
      user: {
        id: r.user.id,
        email: r.user.email,
        username: r.user.username,
        displayName: r.user.display_name,
        bio: r.user.bio ?? undefined,
        avatarUrl: r.user.avatar_url ?? undefined,
        karma: r.user.karma,
        created_at: toISOStringSafe(r.user.created_at) satisfies string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(r.user.updated_at) satisfies string &
          tags.Format<"date-time">,
        deleted_at:
          r.user.deleted_at === null
            ? null
            : (toISOStringSafe(r.user.deleted_at) satisfies
                | (string & tags.Format<"date-time">)
                | null),
      },
      reportReason: {
        id: r.reportReason.id,
        reasonText: r.reportReason.reason_text,
        created_at: toISOStringSafe(
          r.reportReason.created_at,
        ) satisfies string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          r.reportReason.updated_at,
        ) satisfies string & tags.Format<"date-time">,
        deleted_at:
          r.reportReason.deleted_at === null
            ? null
            : (toISOStringSafe(r.reportReason.deleted_at) satisfies
                | (string & tags.Format<"date-time">)
                | null),
      },
      reportedContents_count: r.reportedContents.length,
      created_at: toISOStringSafe(r.created_at) satisfies string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(r.updated_at) satisfies string &
        tags.Format<"date-time">,
      deleted_at:
        r.deleted_at === null
          ? null
          : (toISOStringSafe(r.deleted_at) satisfies
              | (string & tags.Format<"date-time">)
              | null),
    })),
  } satisfies IPageICommunityPlatformReport.ISummary;
}
