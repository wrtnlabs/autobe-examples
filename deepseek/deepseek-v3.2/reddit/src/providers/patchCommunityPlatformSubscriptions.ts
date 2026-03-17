import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSubscriptionAtSummaryTransformer } from "../transformers/CommunityPlatformSubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformSubscriptions(props: {
  body: ICommunityPlatformSubscription.IRequest;
}): Promise<IPageICommunityPlatformSubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.memberId && { member_id: props.body.memberId }),
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.active === true && { active: true, deleted_at: null }),
    ...(props.body.active === false && {
      OR: [{ active: false }, { deleted_at: { not: null } }],
    }),
    ...(props.body.createdAtStart && {
      created_at: {
        gte: props.body.createdAtStart,
      },
    }),
    ...(props.body.createdAtEnd && {
      created_at: {
        lte: props.body.createdAtEnd,
      },
    }),
    ...(props.body.updatedAtStart && {
      updated_at: {
        gte: props.body.updatedAtStart,
      },
    }),
    ...(props.body.updatedAtEnd && {
      updated_at: {
        lte: props.body.updatedAtEnd,
      },
    }),
    ...(props.body.deletedAtStart !== undefined &&
      props.body.deletedAtStart !== null && {
        deleted_at: {
          gte: props.body.deletedAtStart,
        },
      }),
    ...(props.body.deletedAtEnd !== undefined &&
      props.body.deletedAtEnd !== null && {
        deleted_at: {
          lte: props.body.deletedAtEnd,
        },
      }),
    ...(props.body.deletedAtStart === null && { deleted_at: null }),
    ...(props.body.deletedAtEnd === null && { deleted_at: null }),
  } satisfies Prisma.community_platform_subscriptionsWhereInput;
  const data = await MyGlobal.prisma.community_platform_subscriptions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityPlatformSubscriptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_subscriptions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformSubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
