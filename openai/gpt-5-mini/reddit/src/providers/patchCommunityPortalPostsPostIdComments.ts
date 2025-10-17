import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import { IPageICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPortalPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPortalComment.IRequest;
}): Promise<IPageICommunityPortalComment.ISummary> {
  const { postId, body } = props;

  const limit = Number(body.limit ?? 20);
  const offset = Number(body.offset ?? 0);

  // Verify post existence and community privacy
  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
    include: { community: true },
  });
  if (!post) throw new HttpException("Not Found", 404);

  if (post.community && post.community.is_private) {
    // No authentication provided in props → forbid access to private communities
    throw new HttpException("Forbidden", 403);
  }

  // Validate parentCommentId when provided (non-null)
  if (body.parentCommentId !== undefined && body.parentCommentId !== null) {
    const parent = await MyGlobal.prisma.community_portal_comments.findUnique({
      where: { id: body.parentCommentId },
      select: { post_id: true },
    });
    if (!parent)
      throw new HttpException("Bad Request: parentCommentId not found", 400);
    if (parent.post_id !== postId)
      throw new HttpException(
        "Bad Request: parentCommentId does not belong to the specified post",
        400,
      );
  }

  const where = {
    post_id: postId,
    ...(body.includeDeleted !== true && { deleted_at: null }),
    ...(body.parentCommentId !== undefined
      ? body.parentCommentId === null
        ? { parent_comment_id: null }
        : { parent_comment_id: body.parentCommentId }
      : {}),
    ...(body.q !== undefined &&
      body.q !== null && { body: { contains: body.q } }),
  };

  const orderBy: Prisma.community_portal_commentsOrderByWithRelationInput =
    body.sort === "old"
      ? { created_at: "asc" as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_portal_comments.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        post_id: true,
        parent_comment_id: true,
        author_user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_portal_comments.count({ where }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    post_id: r.post_id as string & tags.Format<"uuid">,
    parent_comment_id:
      r.parent_comment_id === null
        ? null
        : (r.parent_comment_id as string & tags.Format<"uuid">),
    author_user_id:
      r.author_user_id === null
        ? null
        : (r.author_user_id as string & tags.Format<"uuid">),
    created_at: toISOStringSafe(r.created_at),
  }));

  const pages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  return {
    pagination: {
      current: Number(offset),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  };
}
