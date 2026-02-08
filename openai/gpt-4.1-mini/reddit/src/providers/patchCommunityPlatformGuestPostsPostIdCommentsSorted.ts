import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestPostsPostIdCommentsSorted(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IRequest;
}): Promise<IPageICommunityPlatformPostComment.ISummary> {
  const body = props.body as any;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const strategy = body.strategy ?? "best";
  if (
    strategy !== "best" &&
    strategy !== "new" &&
    strategy !== "controversial"
  ) {
    throw new HttpException("Invalid sorting strategy", 400);
  }
  const skip = (page - 1) * limit;
  // Using Prisma.sql tagged literal to avoid injection and type error
  const orderByClause =
    strategy === "best"
      ? Prisma.sql`o.sort_value DESC NULLS LAST, c.created_at DESC`
      : strategy === "new"
        ? Prisma.sql`c.created_at DESC`
        : Prisma.sql`ABS(o.sort_value) DESC NULLS LAST, c.created_at DESC`;
  const comments: ReadonlyArray<{
    id: string;
    post_id: string;
    user_id: string;
    parent_comment_id: string | null;
    content_text: string;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: (string & tags.Format<"date-time">) | null;
  }> = await MyGlobal.prisma.$queryRaw(Prisma.sql`
    SELECT c.id, c.post_id, c.user_id, c.parent_comment_id, c.content_text, c.created_at::text, c.updated_at::text, c.deleted_at::text
    FROM community_platform_post_comments c
    LEFT JOIN community_platform_comment_sort_orders o ON c.id = o.community_platform_comment_id AND o.strategy = ${strategy}
    WHERE c.post_id = ${props.postId} AND c.deleted_at IS NULL
    ORDER BY ${orderByClause}
    LIMIT ${limit} OFFSET ${skip}
  `);
  const totalCount =
    await MyGlobal.prisma.community_platform_post_comments.count({
      where: { post_id: props.postId, deleted_at: null },
    });
  return {
    data: comments.map((comment) => ({
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      parent_comment_id: comment.parent_comment_id,
      content_text: comment.content_text,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      deleted_at: comment.deleted_at === null ? null : comment.deleted_at,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
