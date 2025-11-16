import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostBookmark";
import { IPageICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserPostBookmarks(props: {
  user: UserPayload;
  body: ICommunityPlatformPostBookmark.IRequest;
}): Promise<IPageICommunityPlatformPostBookmark.ISummary> {
  const userId = props.user.id;
  const {
    post_id,
    created_after,
    created_before,
    sort_order = "desc",
    page = 1,
    limit = 100,
  } = props.body;

  const skip = (page - 1) * limit;

  const where = {
    user_id: userId,
    deleted_at: null,
    ...(post_id ? { post_id } : {}),
    ...(created_after || created_before
      ? {
          created_at: {
            ...(created_after ? { gte: created_after } : {}),
            ...(created_before ? { lte: created_before } : {}),
          },
        }
      : {}),
  };

  const [bookmarks, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_bookmarks.findMany({
      where,
      include: {
        user: { select: { id: true } },
        post: { select: { id: true, community_id: true, user_id: true } },
      },
      skip,
      take: limit,
      orderBy: { created_at: sort_order },
    }),
    MyGlobal.prisma.community_platform_post_bookmarks.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: bookmarks.map((bm) => ({
      id: bm.id,
      user: { id: bm.user.id },
      post: {
        id: bm.post.id,
        community_id: bm.post.community_id,
        user_id: bm.post.user_id,
      },
      created_at: toISOStringSafe(bm.created_at),
      deleted_at:
        bm.deleted_at !== null ? toISOStringSafe(bm.deleted_at) : undefined,
    })),
  };
}
