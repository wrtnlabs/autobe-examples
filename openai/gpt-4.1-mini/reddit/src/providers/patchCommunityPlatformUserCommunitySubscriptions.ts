import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommunitySubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  // Since props.body lacks the pagination, filter, and sort properties used previously,
  // default pagination is applied: page 1, limit 20
  const page = 1;
  const limit = 20;
  const skip = 0;
  const where: Prisma.community_platform_community_subscriptionsWhereInput = {
    user_id: props.user.id,
    deleted_at: null,
  };
  const orderBy: Prisma.community_platform_community_subscriptionsOrderByWithRelationInput[] =
    [{ created_at: "desc" }];
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where,
    });
  const data =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        community_id: true,
        user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    data: data.map((record) => ({
      communityId: record.community_id,
      userId: record.user_id,
      createdAt: toISOStringSafe(record.created_at) as unknown as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) as unknown as string &
        tags.Format<"date-time">,
      deletedAt:
        record.deleted_at === null
          ? null
          : (toISOStringSafe(record.deleted_at) as unknown as string &
              tags.Format<"date-time">),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
