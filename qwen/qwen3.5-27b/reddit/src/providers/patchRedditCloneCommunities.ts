import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.reddit_clone_communitiesWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "DESC";
  const orderByInput: Prisma.reddit_clone_communitiesOrderByWithRelationInput =
    sortField === "name"
      ? { name: direction.toLowerCase() as "asc" | "desc" }
      : { created_at: direction.toLowerCase() as "asc" | "desc" };
  const records = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_communities.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditCloneCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
