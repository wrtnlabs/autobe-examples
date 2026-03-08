import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunities(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "subscriber_count";
  const order = props.body.order ?? "desc";
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.reddit_platform_communitiesWhereInput;
  const orderByInput = {
    [sort]: order,
  } satisfies Prisma.reddit_platform_communitiesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommunityAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformCommunity.ISummary;
}
