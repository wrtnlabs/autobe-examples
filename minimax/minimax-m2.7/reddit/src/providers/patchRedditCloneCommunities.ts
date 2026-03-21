import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunities(props: {
  body: IRedditCloneCommunityBan.IRequest;
}): Promise<IPageIRedditCloneCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
  } satisfies Prisma.reddit_clone_communitiesWhereInput;
  const orderByInput = (
    props.body.sortBy === "subscriberCount"
      ? { subscriber_count: "desc" as const }
      : { name: "asc" as const }
  ) satisfies Prisma.reddit_clone_communitiesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      subscriber_count: true,
      created_at: true,
      member: RedditCloneMemberSessionAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_communities.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      subscriber_count: item.subscriber_count,
      created_at: toISOStringSafe(item.created_at),
      owner: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        item.member,
      ),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
