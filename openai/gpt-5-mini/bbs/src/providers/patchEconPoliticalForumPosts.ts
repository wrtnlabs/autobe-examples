import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import { IPageIEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPoliticalForumPosts(props: {
  body: IEconPoliticalForumPost.IRequest;
}): Promise<IPageIEconPoliticalForumPost.ISummary> {
  const { body } = props;

  // Pagination defaults and validation
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  if (limit > 100)
    throw new HttpException("Page size exceeds maximum of 100", 400);
  if (page < 1) throw new HttpException("Page must be >= 1", 400);

  // Search length validation
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 500
  )
    throw new HttpException("Search term too long", 400);

  // Validate referenced resources when scoped by threadId or parentId
  if (body.threadId !== undefined && body.threadId !== null) {
    const thread =
      await MyGlobal.prisma.econ_political_forum_threads.findUnique({
        where: { id: body.threadId },
        select: { id: true },
      });
    if (!thread) throw new HttpException("Thread not found", 404);
  }

  if (body.parentId !== undefined && body.parentId !== null) {
    const parent = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
      where: { id: body.parentId },
      select: { id: true },
    });
    if (!parent) throw new HttpException("Parent post not found", 404);
  }

  // Sorting selection - ensure literal 'asc'|'desc' type to satisfy Prisma SortOrder
  const orderBy = {
    created_at: (body.sort === "oldest" ? "asc" : "desc") as "asc" | "desc",
  };

  // Query database (inline where objects to preserve type clarity)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_posts.findMany({
      where: {
        deleted_at: null,
        ...(body.threadId !== undefined &&
          body.threadId !== null && { thread_id: body.threadId }),
        ...(body.authorId !== undefined &&
          body.authorId !== null && { author_id: body.authorId }),
        ...(body.parentId !== undefined &&
          body.parentId !== null && { parent_id: body.parentId }),
        ...(body.search !== undefined &&
          body.search !== null && { content: { contains: body.search } }),
        ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
        (body.createdTo !== undefined && body.createdTo !== null)
          ? {
              created_at: {
                ...(body.createdFrom !== undefined &&
                  body.createdFrom !== null && {
                    gte: toISOStringSafe(body.createdFrom),
                  }),
                ...(body.createdTo !== undefined &&
                  body.createdTo !== null && {
                    lte: toISOStringSafe(body.createdTo),
                  }),
              },
            }
          : {}),
        ...(body.includeHidden !== true && { is_hidden: false }),
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.econ_political_forum_posts.count({
      where: {
        deleted_at: null,
        ...(body.threadId !== undefined &&
          body.threadId !== null && { thread_id: body.threadId }),
        ...(body.authorId !== undefined &&
          body.authorId !== null && { author_id: body.authorId }),
        ...(body.parentId !== undefined &&
          body.parentId !== null && { parent_id: body.parentId }),
        ...(body.search !== undefined &&
          body.search !== null && { content: { contains: body.search } }),
        ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
        (body.createdTo !== undefined && body.createdTo !== null)
          ? {
              created_at: {
                ...(body.createdFrom !== undefined &&
                  body.createdFrom !== null && {
                    gte: toISOStringSafe(body.createdFrom),
                  }),
                ...(body.createdTo !== undefined &&
                  body.createdTo !== null && {
                    lte: toISOStringSafe(body.createdTo),
                  }),
              },
            }
          : {}),
        ...(body.includeHidden !== true && { is_hidden: false }),
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    thread_id: r.thread_id,
    author_id: r.author_id,
    parent_id: r.parent_id === null ? undefined : r.parent_id,
    is_edited: r.is_edited,
    edited_at: r.edited_at ? toISOStringSafe(r.edited_at) : undefined,
    is_hidden: r.is_hidden,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(Number(total) / Number(limit)),
  };

  return { pagination, data };
}
