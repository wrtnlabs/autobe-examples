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

export async function patchCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  const userId = props.user.id;
  const body = props.body ?? {};
  const searchText = body.search_text;
  const page = body.page ?? 1;
  const limit = body.page_size ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const where = {
    user_id: userId,
    deleted_at: null,
    ...(searchText !== undefined && searchText !== null && searchText.length > 0
      ? {
          community: {
            name: {
              contains: searchText,
            },
          },
        }
      : {}),
  };

  const orderBy =
    sortBy === "updated_at"
      ? { updated_at: sortOrder }
      : { created_at: sortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: true,
        community: true,
      },
    }),
    MyGlobal.prisma.community_platform_community_subscriptions.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    user: {
      id: row.user.id,
      display_name: row.user.display_name,
    },
    community: {
      id: row.community.id,
      name: row.community.name,
      description: row.community.description,
    },
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
