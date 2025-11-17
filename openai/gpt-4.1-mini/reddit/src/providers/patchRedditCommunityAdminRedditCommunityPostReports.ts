import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import { IPageIRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityPostReports(props: {
  admin: AdminPayload;
  body: IRedditCommunityPostReport.IRequest;
}): Promise<IPageIRedditCommunityPostReport.ISummary> {
  const {
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "desc",
    filterReportReason,
    filterStatus,
    filterPostId,
    filterReporterUserId,
  } = props.body;

  const skip = (page - 1) * limit;

  const where: {
    AND?: object[];
    reason?: { contains: string };
    status?: string;
    reddit_community_post_id?: string;
    reddit_community_registereduser_id?: string;
    deleted_at?: null;
  } = { deleted_at: null };

  const andConditions: object[] = [];
  if (filterReportReason !== undefined) {
    andConditions.push({ reason: { contains: filterReportReason } });
  }
  if (filterStatus !== undefined) {
    andConditions.push({ status: filterStatus });
  }
  if (filterPostId !== undefined) {
    andConditions.push({ reddit_community_post_id: filterPostId });
  }
  if (filterReporterUserId !== undefined) {
    andConditions.push({
      reddit_community_registereduser_id: filterReporterUserId,
    });
  }
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.reddit_community_post_reports.count({ where }),
  ]);

  const postIds = Array.from(
    new Set(reports.map((r) => r.reddit_community_post_id)),
  );
  const reporterUserIds = Array.from(
    new Set(reports.map((r) => r.reddit_community_registereduser_id)),
  );

  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: { id: { in: postIds } },
    select: {
      id: true,
      type: true,
      title: true,
      reddit_community_registereduser_id: true,
      reddit_community_community_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  const regUsers =
    await MyGlobal.prisma.reddit_community_registeredusers.findMany({
      where: { id: { in: reporterUserIds } },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  const communitiesIds = Array.from(
    new Set(posts.map((p) => p.reddit_community_community_id)),
  );
  const communities =
    await MyGlobal.prisma.reddit_community_communities.findMany({
      where: { id: { in: communitiesIds } },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        creator_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  const postRegUserIds = Array.from(
    new Set(posts.map((p) => p.reddit_community_registereduser_id)),
  );
  const postRegUsers =
    await MyGlobal.prisma.reddit_community_registeredusers.findMany({
      where: { id: { in: postRegUserIds } },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  const communityMap = new Map(communities.map((c) => [c.id, c]));
  const postRegUserMap = new Map(postRegUsers.map((u) => [u.id, u]));
  const reporterUserMap = new Map(regUsers.map((u) => [u.id, u]));
  const postMap = new Map(posts.map((p) => [p.id, p]));

  return {
    data: reports.map((report) => {
      const post = postMap.get(report.reddit_community_post_id);
      if (!post) throw new HttpException("Post not found", 404);
      const reporterUser = reporterUserMap.get(
        report.reddit_community_registereduser_id,
      );
      if (!reporterUser)
        throw new HttpException("Reporter user not found", 404);

      const postRegUser = postRegUserMap.get(
        post.reddit_community_registereduser_id,
      );
      if (!postRegUser)
        throw new HttpException("Post's registered user not found", 404);

      const community = communityMap.get(post.reddit_community_community_id);
      if (!community) throw new HttpException("Community not found", 404);

      return {
        id: report.id,
        reason: report.reason,
        created_at: toISOStringSafe(report.created_at),
        updated_at: toISOStringSafe(report.updated_at),
        deleted_at: report.deleted_at
          ? toISOStringSafe(report.deleted_at)
          : null,
        post: {
          id: post.id,
          type: post.type,
          title: post.title,
          reddit_community_registereduser: {
            id: postRegUser.id,
            email: postRegUser.email,
            created_at: toISOStringSafe(postRegUser.created_at),
            updated_at: toISOStringSafe(postRegUser.updated_at),
            deleted_at: postRegUser.deleted_at
              ? toISOStringSafe(postRegUser.deleted_at)
              : null,
          },
          reddit_community_community: {
            id: community.id,
            name: community.name,
            title: community.title,
            description: community.description ?? null,
            creator_id: community.creator_id,
            created_at: toISOStringSafe(community.created_at),
            updated_at: toISOStringSafe(community.updated_at),
            deleted_at: community.deleted_at
              ? toISOStringSafe(community.deleted_at)
              : null,
          },
          created_at: toISOStringSafe(post.created_at),
          updated_at: toISOStringSafe(post.updated_at),
        },
        registered_user: {
          id: reporterUser.id,
          email: reporterUser.email,
          created_at: toISOStringSafe(reporterUser.created_at),
          updated_at: toISOStringSafe(reporterUser.updated_at),
          deleted_at: reporterUser.deleted_at
            ? toISOStringSafe(reporterUser.deleted_at)
            : null,
        },
      };
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
