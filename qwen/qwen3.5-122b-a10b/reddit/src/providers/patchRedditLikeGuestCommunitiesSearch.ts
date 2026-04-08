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

export async function patchRedditLikeGuestCommunitiesSearch(props: {
  guest: GuestPayload;
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = Math.min(
    props.body.limit ?? 100,
    100,
  );
  const offset: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.body.offset ?? (page - 1) * limit;
  const whereInput: Prisma.reddit_like_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.reddit_like_communitiesWhereInput;
  const orderByInput: Prisma.reddit_like_communitiesOrderByWithRelationInput =
    props.body.sort_by === "name"
      ? { name: props.body.sort_order ?? "asc" }
      : props.body.sort_by === "created_at"
        ? { created_at: props.body.sort_order ?? "desc" }
        : { created_at: "desc" as const };
  const records = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: whereInput,
    skip: offset,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeCommunityAtSummaryTransformer.transform,
  );
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> =
    total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
