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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditLikeModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Get communities where this moderator has privileges
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_like_moderators.findMany({
      where: {
        member_id: props.moderator.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = moderatorCommunities.map((m) => m.community_id);
  // If no moderated communities, return empty result
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // If filtering by specific community, verify moderator has access
  if (props.body.communityId) {
    if (!communityIds.includes(props.body.communityId)) {
      throw new HttpException(
        "You don't have moderator privileges for this community",
        403,
      );
    }
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_like_reportsWhereInput = {
    ...(props.body.communityId
      ? { community_id: props.body.communityId }
      : { community_id: { in: communityIds } }),
    status: props.body.status ?? "pending",
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
  };
  // Get reports and total count
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_reports.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...RedditLikeReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_reports.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditLikeReportAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
