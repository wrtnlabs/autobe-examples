import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Get communities moderated by this user
  const moderatedCommunities =
    await MyGlobal.prisma.reddit_like_moderators.findMany({
      where: {
        member_id: props.moderator.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      } satisfies Prisma.reddit_like_moderatorsSelect,
    });
  const communityIds = moderatedCommunities.map((m) => m.community_id);
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    } satisfies IPageIRedditLikeReport.ISummary;
  }
  // Validate and determine community filter
  const communityFilter =
    props.body.communityId != null
      ? communityIds.includes(props.body.communityId)
        ? props.body.communityId
        : null
      : { in: communityIds };
  if (communityFilter === null) {
    throw new HttpException(
      "Forbidden - Not a moderator for this community",
      403,
    );
  }
  // Build created_at filter
  const createdAtFilter = {
    ...(props.body.createdAtFrom != null && { gte: props.body.createdAtFrom }),
    ...(props.body.createdAtTo != null && { lte: props.body.createdAtTo }),
  };
  // Build where clause - removed deleted_at since it doesn't exist on reports
  const whereInput = {
    community_id: communityFilter,
    status: props.body.status ?? "pending",
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.reddit_like_reportsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query reports with transformer select
  const reports = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereInput,
  });
  // Transform results
  const transformedReports = await ArrayUtil.asyncMap(
    reports,
    RedditLikeReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedReports,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeReport.ISummary;
}
