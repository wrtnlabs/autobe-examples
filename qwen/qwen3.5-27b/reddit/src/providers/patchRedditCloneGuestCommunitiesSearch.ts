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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestCommunitiesSearch(props: {
  guest: GuestPayload;
  body: IRedditCloneCommunity.IRequest;
}): Promise<IPageIRedditCloneCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? pageSize;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const whereInput = {
    deleted_at: null,
    ...(search &&
      search.length > 0 && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
  } satisfies Prisma.reddit_clone_communitiesWhereInput;
  const sortField = props.body.sort ?? "name";
  const sortOrder = props.body.order ?? "asc";
  const orderByInput = (
    sortField === "subscriberCount"
      ? { subscriber_count: sortOrder as "asc" | "desc" }
      : sortField === "createdAt"
        ? { created_at: sortOrder as "asc" | "desc" }
        : { name: sortOrder as "asc" | "desc" }
  ) satisfies Prisma.reddit_clone_communitiesOrderByWithRelationInput;
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
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
