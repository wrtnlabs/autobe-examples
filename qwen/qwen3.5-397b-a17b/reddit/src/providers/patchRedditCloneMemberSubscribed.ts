import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberSubscribed(props: {
  member: MemberPayload;
  body: IRedditCloneSubscription.IRequest;
}): Promise<IPageIRedditCloneCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at_desc";
  const orderByInput = (
    sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : sort === "community_name_asc"
        ? { community: { name: "asc" as const } }
        : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_clone_subscriptionsOrderByWithRelationInput;
  const whereInput = {
    member_id: props.member.id,
    deleted_at: null,
    community: {
      deleted_at: null,
      ...(props.body.community_name !== undefined && {
        name: {
          contains: props.body.community_name,
          mode: "insensitive" as const,
        },
      }),
    },
  } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
  const subscriptions =
    await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        community: RedditCloneCommunityAtSummaryTransformer.select(),
      },
    });
  const total = await MyGlobal.prisma.reddit_clone_subscriptions.count({
    where: whereInput,
  });
  const communities = subscriptions.map((s) => s.community);
  return {
    data: await ArrayUtil.asyncMap(
      communities,
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
