import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditLikeCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberSubscribedCommunities(props: {
  member: MemberPayload;
  body: IRedditLikeCommunitySubscription.IRequest;
}): Promise<IPageIRedditLikeCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_like_member_id: props.member.id,
    deleted_at: null,
    community: {
      deleted_at: null,
      ...(props.body.search && {
        name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
    },
  } satisfies Prisma.reddit_like_community_subscriptionsWhereInput;
  const orderByInput = (
    props.body.sort === "name"
      ? { community: { name: "asc" as const } }
      : props.body.sort === "-name"
        ? { community: { name: "desc" as const } }
        : props.body.sort === "-created_at"
          ? { created_at: "desc" as const }
          : { created_at: "asc" as const }
  ) satisfies Prisma.reddit_like_community_subscriptionsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditLikeCommunitySubscriptionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_like_community_subscriptions.count(
    {
      where: whereInput,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeCommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
