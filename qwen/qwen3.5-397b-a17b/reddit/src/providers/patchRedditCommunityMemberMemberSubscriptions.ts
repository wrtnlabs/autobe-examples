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

export async function patchRedditCommunityMemberMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_subscriptionsWhereInput = {
    member_id: props.member.id,
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        community: {
          name: { contains: props.body.search, mode: "insensitive" },
        },
      }),
  } satisfies Prisma.reddit_community_subscriptionsWhereInput;
  const records = await MyGlobal.prisma.reddit_community_subscriptions.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_community_subscriptions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunitySubscription.ISummary;
}
