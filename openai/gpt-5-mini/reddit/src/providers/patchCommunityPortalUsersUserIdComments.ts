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

export async function patchCommunityPortalUsersUserIdComments(props: {
  userId: string & tags.Format<"uuid">;
  body: ICommunityPortalComment.IRequest;
}): Promise<IPageICommunityPortalComment.ISummary> {
  const { userId, body: request } = props;

  // Verify user exists
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Not Found", 404);

  // includeDeleted handling - no auth in props -> forbid
  const includeDeleted = request.includeDeleted === true;
  if (includeDeleted) throw new HttpException("Forbidden", 403);

  const limit = Number(request.limit ?? 20);
  const offset = Number(request.offset ?? 0);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_portal_comments.findMany({
      where: {
        author_user_id: userId,
        ...(request.parentCommentId !== undefined &&
          request.parentCommentId !== null && {
            parent_comment_id: request.parentCommentId,
          }),
        deleted_at: null,
        ...(request.q !== undefined &&
          request.q !== null && { body: { contains: request.q } }),
      },
      orderBy:
        request.sort === "old" ? { created_at: "asc" } : { created_at: "desc" },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.community_portal_comments.count({
      where: {
        author_user_id: userId,
        ...(request.parentCommentId !== undefined &&
          request.parentCommentId !== null && {
            parent_comment_id: request.parentCommentId,
          }),
        deleted_at: null,
        ...(request.q !== undefined &&
          request.q !== null && { body: { contains: request.q } }),
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    parent_comment_id:
      r.parent_comment_id === null ? null : r.parent_comment_id,
    author_user_id: r.author_user_id === null ? null : r.author_user_id,
    created_at: toISOStringSafe(r.created_at),
  }));

  const page = {
    pagination: {
      current: Number(offset),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data,
  } satisfies IPageICommunityPortalComment.ISummary;

  return page;
}
