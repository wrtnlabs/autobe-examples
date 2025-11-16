import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommunitySubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  const {
    user_id,
    community_id,
    created_at_from,
    created_at_to,
    include_deleted,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  const where: Record<string, any> = {
    ...(user_id ? { user_id } : {}),
    ...(community_id ? { community_id } : {}),
    ...(created_at_from ? { created_at: { gte: created_at_from } } : {}),
    ...(created_at_to
      ? {
          created_at: {
            ...(created_at_from ? { gte: created_at_from } : {}),
            lte: created_at_to,
          },
        }
      : {}),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  const realSortBy = sort_by ?? "created_at";
  const realSortOrder = sort_order ?? "desc";
  const realPage = page ?? 1;
  const realLimit = limit ?? 20;
  const skip = (realPage - 1) * realLimit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where,
      skip,
      take: realLimit,
      orderBy: { [realSortBy]: realSortOrder },
      include: {
        user: true,
        community: true,
      },
    }),
    MyGlobal.prisma.community_platform_community_subscriptions.count({
      where,
    }),
  ]);

  const data = records.map((sub) => ({
    id: sub.id,
    user: { id: sub.user.id },
    community: {
      id: sub.community.id,
      name: sub.community.name,
      display_title: sub.community.display_title,
      description: sub.community.description,
      visibility: sub.community.visibility,
      image_url:
        typeof sub.community.image_url === "undefined" ||
        sub.community.image_url === null
          ? undefined
          : sub.community.image_url,
      status: sub.community.status,
    },
    created_at: toISOStringSafe(sub.created_at),
    deleted_at:
      typeof sub.deleted_at === "undefined"
        ? undefined
        : sub.deleted_at === null
          ? null
          : toISOStringSafe(sub.deleted_at),
  }));

  return {
    data,
    pagination: {
      current: realPage,
      limit: realLimit,
      records: total,
      pages: Math.ceil(total / realLimit),
    },
  };
}
