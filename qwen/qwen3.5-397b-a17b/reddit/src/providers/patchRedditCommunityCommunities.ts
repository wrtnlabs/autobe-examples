import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
  };
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const orderByInput: Prisma.reddit_community_communitiesOrderByWithRelationInput =
    sort === "name"
      ? { name: order }
      : sort === "subscriber_count"
        ? { subscriptions: { _count: order } }
        : { created_at: order };
  const data = await MyGlobal.prisma.reddit_community_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommunityAtSummaryTransformer.transform,
    ),
  };
}
