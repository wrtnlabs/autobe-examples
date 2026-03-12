import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunities(props: {
  body: IRedditCloneCommunity.IRequest;
}): Promise<IPageIRedditCloneCommunity.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for active communities
  const whereInput: Prisma.reddit_clone_communitiesWhereInput = {
    deleted_at: null,
  };
  // Add search filter if provided
  if (props.body.search && props.body.search.trim() !== "") {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Build order by clause
  const sortField = props.body.sort ?? "name";
  const sortOrder = props.body.order ?? "asc";
  const orderByInput: Prisma.reddit_clone_communitiesOrderByWithRelationInput =
    sortField === "name"
      ? { name: sortOrder as "asc" | "desc" }
      : sortField === "subscriberCount"
        ? { subscriber_count: sortOrder as "asc" | "desc" }
        : sortField === "createdAt"
          ? { created_at: sortOrder as "asc" | "desc" }
          : { name: "asc" };
  // Execute findMany and count queries sequentially
  const data = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_communities.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
