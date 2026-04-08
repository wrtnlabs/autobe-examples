import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestCommunities(props: {
  guest: GuestPayload;
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const offset: number = props.body.offset ?? (page - 1) * limit;
  const whereInput: Prisma.reddit_like_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
  };
  const sortField: "name" | "created_at" =
    props.body.sort_by === "name" ? "name" : "created_at";
  const sortOrder: Prisma.SortOrder =
    props.body.sort_order === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.reddit_like_communitiesOrderByWithRelationInput =
    sortField === "name" ? { name: sortOrder } : { created_at: sortOrder };
  const records = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
    ...RedditLikeCommunityAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.reddit_like_communities.count({
    where: whereInput,
  });
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeCommunityAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
