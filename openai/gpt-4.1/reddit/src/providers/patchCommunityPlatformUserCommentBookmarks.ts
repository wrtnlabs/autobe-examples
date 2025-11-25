import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentBookmark";
import { IPageICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommentBookmarks(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentBookmark.IRequest;
}): Promise<IPageICommunityPlatformCommentBookmark.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Where condition builder for date range logic
  const where = {
    user_id: props.user.id,
    ...(props.body.comment_id && { comment_id: props.body.comment_id }),
    ...(props.body.created_at_min || props.body.created_at_max
      ? {
          created_at: {
            ...(props.body.created_at_min && {
              gte: props.body.created_at_min,
            }),
            ...(props.body.created_at_max && {
              lte: props.body.created_at_max,
            }),
          },
        }
      : {}),
    ...(props.body.updated_at_min || props.body.updated_at_max
      ? {
          updated_at: {
            ...(props.body.updated_at_min && {
              gte: props.body.updated_at_min,
            }),
            ...(props.body.updated_at_max && {
              lte: props.body.updated_at_max,
            }),
          },
        }
      : {}),
    ...(props.body.include_deleted ? {} : { deleted_at: null }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_bookmarks.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true,
        comment: {
          include: {
            user: true,
            post: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_platform_comment_bookmarks.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((bm) => ({
      id: bm.id,
      user: { id: bm.user.id },
      comment: {
        id: bm.comment.id,
        user: { id: bm.comment.user.id },
        post: {
          id: bm.comment.post.id,
          community_id: bm.comment.post.community_id,
          user_id: bm.comment.post.user_id,
        },
        parent_id: bm.comment.parent_id ?? undefined,
        created_at: toISOStringSafe(bm.comment.created_at),
      },
      created_at: toISOStringSafe(bm.created_at),
      deleted_at:
        bm.deleted_at === null || typeof bm.deleted_at === "undefined"
          ? bm.deleted_at
          : toISOStringSafe(bm.deleted_at),
    })),
  };
}
