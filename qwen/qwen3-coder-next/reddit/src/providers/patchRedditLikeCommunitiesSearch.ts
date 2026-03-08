import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunitiesSearch(props: {
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where condition
  const where: Prisma.reddit_like_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  // Determine sort order - use created_at since subscriber_count doesn't exist in schema
  const orderBy: Prisma.reddit_like_communitiesOrderByWithRelationInput =
    props.body.sort === "subscribers"
      ? { created_at: "desc" }
      : props.body.sort === "newest"
        ? { created_at: "desc" }
        : { name: "asc" };
  // Fetch paginated results
  const data = await MyGlobal.prisma.reddit_like_communities.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      icon_url: true,
      created_at: true,
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where,
  });
  // Transform results to response format
  const transformedData: IRedditLikeCommunity.ISummary[] = data.map(
    (community) => ({
      id: community.id as string & tags.Format<"uuid">,
      name: community.name,
      icon_url:
        community.icon_url === null
          ? undefined
          : (community.icon_url as (string & tags.Format<"uri">) | undefined),
      created_at: community.created_at.toISOString() as string &
        tags.Format<"date-time">,
    }),
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
