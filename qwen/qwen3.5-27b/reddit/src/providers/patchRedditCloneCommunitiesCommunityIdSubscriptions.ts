import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunitySubscription";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditCloneCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdSubscriptions(props: {
  communityId: string;
  body: IRedditCloneCommunitySubscription.IRequest;
}): Promise<IPageIRedditCloneCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    reddit_clone_community_id: props.communityId,
    ...(props.body.communityName && {
      community: {
        name: {
          contains: props.body.communityName,
        },
      },
    }),
    ...(props.body.subscribedAfter && {
      created_at: {
        gte: new Date(props.body.subscribedAfter),
      },
    }),
    ...(props.body.subscribedBefore && {
      created_at: {
        lte: new Date(props.body.subscribedBefore),
      },
    }),
  } satisfies Prisma.reddit_clone_community_subscriptionsWhereInput;
  const orderByInput = {
    ...(props.body.sort && props.body.order
      ? {
          [props.body.sort]: props.body.order,
        }
      : {
          created_at: "desc" as const,
        }),
  } satisfies Prisma.reddit_clone_community_subscriptionsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunitySubscriptionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneCommunitySubscriptionAtSummaryTransformer.transform,
    ),
  };
}
