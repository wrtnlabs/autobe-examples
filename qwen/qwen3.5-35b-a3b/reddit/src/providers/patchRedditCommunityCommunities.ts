import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
  const requestPage: number | undefined = props.body.page;
  const requestLimit: number | undefined = props.body.limit;
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    requestPage && requestPage >= 1 ? requestPage : 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> =
    requestLimit !== undefined && requestLimit >= 1 && requestLimit <= 100
      ? requestLimit
      : 100;
  const skip: number = (page - 1) * limit;
  const nameFilter: string | undefined = props.body.name;
  const whereInput: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
    ...(nameFilter !== undefined && nameFilter !== null && nameFilter !== ""
      ? {
          name: {
            contains: nameFilter,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.reddit_community_communitiesWhereInput;
  const data = await MyGlobal.prisma.reddit_community_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { name: "asc" as const },
    ...RedditCommunityCommunityAtSummaryTransformer.select(),
  });
  const total: number & tags.Type<"int32"> & tags.Minimum<0> =
    await MyGlobal.prisma.reddit_community_communities.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
