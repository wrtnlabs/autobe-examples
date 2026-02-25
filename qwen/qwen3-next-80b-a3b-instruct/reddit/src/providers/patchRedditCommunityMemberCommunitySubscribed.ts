import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberCommunitySubscribed(props: {
  member: MemberPayload;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    user_id: props.member.id,
    AND: [
      props.body.search
        ? {
            OR: [
              { community: { name: { contains: props.body.search } } },
              { user: { username: { contains: props.body.search } } },
            ],
          }
        : ({} as any),
    ],
  } satisfies Prisma.reddit_community_subscriptionsWhereInput;
  // Map sort options to valid Prisma orderBy fields
  const orderByInput = (
    props.body.sort === "most-subscribers"
      ? { created_at: "desc" }
      : props.body.sort === "least-subscribers"
        ? { created_at: "asc" }
        : props.body.sort === "oldest"
          ? { created_at: "asc" }
          : { created_at: "desc" }
  ) satisfies Prisma.reddit_community_subscriptionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_subscriptions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_subscriptions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
