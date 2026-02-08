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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsCommunitiesSubscriptions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  // Since props.body.page and limit do not exist, use default pagination values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.community_platform_community_subscriptionsWhereInput =
    {
      deleted_at: null,
    };
  // Cannot use filter on non-existent keys, so no filtering on community_name, created_from, created_to
  const data =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        created_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: whereConditions,
    });
  // Map the data to the summary data with proper string conversion
  const mappedData: ICommunityPlatformCommunitySubscription.ISummary[] =
    data.map((item) => ({
      id: item.id,
      community_id: item.community_id,
      user_id: item.user_id,
      created_at: toISOStringSafe(item.created_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      community: {
        id: item.community.id,
        name: item.community.name,
      },
    }));
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
