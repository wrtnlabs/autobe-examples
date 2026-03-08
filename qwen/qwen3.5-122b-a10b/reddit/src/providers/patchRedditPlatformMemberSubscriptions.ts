import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditPlatformCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunitySubscription.IRequest;
}): Promise<IPageIRedditPlatformCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 10, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_community_subscriptionsWhereInput = {
    member_id: props.member.id,
    deleted_at: null,
    ...(props.body.community_id && {
      community_id: props.body.community_id,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.search && {
      community: {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    }),
  } satisfies Prisma.reddit_platform_community_subscriptionsWhereInput;
  const orderByInput: Prisma.reddit_platform_community_subscriptionsOrderByWithRelationInput[] =
    [{ created_at: "desc" as const }];
  if (props.body.sort) {
    const parts = props.body.sort.split(":");
    if (parts.length === 2) {
      const [field, direction] = parts;
      const orderDirection =
        direction.toUpperCase() === "ASC"
          ? ("asc" as const)
          : ("desc" as const);
      if (field === "name") {
        orderByInput.unshift({ community: { name: orderDirection } });
      } else if (field === "subscriber_count") {
        orderByInput.unshift({
          community: { subscriber_count: orderDirection },
        });
      } else if (field === "created_at") {
        orderByInput[0] = { created_at: orderDirection };
      }
    }
  }
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformCommunitySubscriptionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
      where: whereInput,
    });
  const data = await ArrayUtil.asyncMap(
    subscriptions,
    RedditPlatformCommunitySubscriptionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformCommunitySubscription.ISummary;
}
