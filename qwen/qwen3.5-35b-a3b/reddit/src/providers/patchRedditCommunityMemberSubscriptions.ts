import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function patchRedditCommunityMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * pageSize;
  const whereInput: Prisma.reddit_community_subscriptionsWhereInput = {
    reddit_community_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.minCreatedAt && {
      created_at: {
        gte: new Date(props.body.minCreatedAt),
      },
    }),
    ...(props.body.maxCreatedAt && {
      created_at: {
        lte: new Date(props.body.maxCreatedAt),
      },
    }),
    ...(props.body.communityName && {
      community: {
        name: props.body.communityName,
      },
    }),
  } satisfies Prisma.reddit_community_subscriptionsWhereInput;
  const orderByInput = (
    props.body.sortBy === "community_name"
      ? {
          community: {
            name: props.body.sortDirection === "ASC" ? "asc" : "desc",
          },
        }
      : { created_at: props.body.sortDirection === "ASC" ? "asc" : "desc" }
  ) satisfies Prisma.reddit_community_subscriptionsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: pageSize,
      ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_subscriptions.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunitySubscription.ISummary;
}
