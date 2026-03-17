import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
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
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberModerationReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  // Verify moderator status in at least one community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Not a moderator", 403);
  }
  // Build moderation community IDs for filtering
  const moderatedCommunities =
    await MyGlobal.prisma.reddit_community_moderators.findMany({
      where: {
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_community_community_id: true,
      },
    });
  const communityIds = moderatedCommunities.map(
    (m) => m.reddit_community_community_id,
  );
  // Build where filter
  const whereInput: Prisma.reddit_community_reportsWhereInput & {
    community_id?: Prisma.StringFieldUpdateOperationsInput | string;
  } = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.reporter_username !== undefined && {
      reporter: {
        username: {
          contains: props.body.reporter_username,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.reason_search !== undefined && {
      reason: {
        contains: props.body.reason_search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.createdAtGte !== undefined && {
      created_at: { gte: new Date(props.body.createdAtGte) },
    }),
    ...(props.body.createdAtLte !== undefined && {
      created_at: { lte: new Date(props.body.createdAtLte) },
    }),
    ...(props.body.searchText !== undefined && {
      OR: [
        {
          reason: {
            contains: props.body.searchText,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };
  // Apply community filter unless includeAll is true
  if (props.body.includeAll !== true) {
    if (props.body.community_id !== undefined) {
      // Explicit community_id: verify it's in moderated communities
      if (!communityIds.includes(props.body.community_id)) {
        // Return empty results for unauthorized community
        return {
          pagination: {
            current: props.body.page ?? 1,
            limit: props.body.pageSize ?? 50,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
          data: [],
        };
      }
      whereInput.community_id = props.body.community_id;
    } else {
      // No explicit community: filter by all moderated communities
      whereInput.community_id = { in: communityIds };
    }
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 50;
  const limit = props.body.limit ?? 100;
  const effectivePageSize = Math.min(pageSize, limit > 0 ? limit : 100);
  const skip = (page - 1) * effectivePageSize;
  // Build orderBy
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sortBy ?? "createdAt";
      const sortOrder = props.body.sortOrder ?? "desc";
      switch (sortBy) {
        case "status":
          return { status: sortOrder as "asc" | "desc" };
        case "reporterId":
          return { reporter_id: sortOrder as "asc" | "desc" };
        default:
          return { created_at: sortOrder as "asc" | "desc" };
      }
    })();
  // Execute query with transformer select
  const data = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereInput,
    skip,
    take: effectivePageSize,
    orderBy: orderByInput,
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: effectivePageSize,
      records: total,
      pages: Math.ceil(total / effectivePageSize),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
