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

export async function patchRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Build where filter for moderator scoping
  const moderatorWhere = {
    reddit_community_moderator_id: props.member.id,
    deleted_at: null,
  };
  // Build status filter if provided
  const statusWhere = props.body.status
    ? { status: props.body.status }
    : undefined;
  // Build community filter if provided
  const communityWhere = props.body.community_id
    ? { community_id: props.body.community_id }
    : undefined;
  // Build target_type filter if provided
  const targetTypeWhere = props.body.target_type
    ? { target_type: props.body.target_type }
    : undefined;
  // Build reporter filter
  const reporterWhere = props.body.reporter_username
    ? {
        reporter: {
          username: {
            contains: props.body.reporter_username,
          },
        },
      }
    : undefined;
  // Build reason search filter if provided
  const reasonWhere = props.body.reason_search
    ? {
        reason: {
          contains: props.body.reason_search,
          mode: "insensitive" as const,
        },
      }
    : undefined;
  // Build date range filter
  const dateWhere: Prisma.reddit_community_reportsWhereInput = {
    ...(props.body.createdAtGte && {
      created_at: { gte: new Date(props.body.createdAtGte) },
    }),
    ...(props.body.createdAtLte && {
      created_at: { lte: new Date(props.body.createdAtLte) },
    }),
  };
  // Combine all filters with moderator scoping
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    ...statusWhere,
    ...communityWhere,
    ...targetTypeWhere,
    ...(reporterWhere && { reporter: reporterWhere.reporter }),
    ...(reasonWhere && { reason: reasonWhere.reason }),
    ...dateWhere,
    community: {
      moderators: {
        some: moderatorWhere,
      },
    },
  };
  // Handle sortBy and sortOrder
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput[] =
    props.body.sortBy === "status"
      ? [
          {
            status: props.body.sortOrder === "ASC" ? "asc" : "desc",
          },
        ]
      : props.body.sortBy === "reporterId"
        ? [
            {
              reporter: {
                created_at: props.body.sortOrder === "ASC" ? "asc" : "desc",
              },
            },
          ]
        : [
            {
              created_at: props.body.sortOrder === "ASC" ? "asc" : "desc",
            },
          ];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_reports.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityReport.ISummary;
}
