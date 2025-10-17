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

export async function patchEconPoliticalForumThreadsThreadIdPosts(props: {
  threadId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumPost.IRequest;
}): Promise<IPageIEconPoliticalForumPost> {
  const { threadId, body } = props;

  try {
    // Verify thread existence
    const thread =
      await MyGlobal.prisma.econ_political_forum_threads.findUnique({
        where: { id: threadId },
        select: { id: true },
      });
    if (!thread)
      throw new HttpException("Not Found: thread does not exist", 404);

    // Privileged flags require authenticated moderator/admin - not available here
    if (body.includeHidden === true || body.includeDeleted === true) {
      throw new HttpException(
        "Forbidden: includeHidden/includeDeleted require privileges",
        403,
      );
    }

    // Pagination
    const page = Number(body.page ?? 1);
    const limit = Math.min(Number(body.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    // Determine orderBy
    const orderBy =
      body.sort === "oldest"
        ? { created_at: "asc" as const }
        : { created_at: "desc" as const };

    // Note: 'most_voted' requires aggregated data; fall back to newest

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_posts.findMany({
        where: {
          thread_id: threadId,
          deleted_at: null,
          is_hidden: false,
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
        },
        orderBy,
        skip,
        take: limit,
      }),
      MyGlobal.prisma.econ_political_forum_posts.count({
        where: {
          thread_id: threadId,
          deleted_at: null,
          is_hidden: false,
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
        },
      }),
    ]);

    const data = rows.map((p) => ({
      id: p.id as string & tags.Format<"uuid">,
      thread_id: p.thread_id as string & tags.Format<"uuid">,
      author_id: p.author_id as string & tags.Format<"uuid">,
      parent_id:
        p.parent_id === null
          ? null
          : (p.parent_id as string & tags.Format<"uuid">),
      content: p.content,
      is_edited: p.is_edited,
      edited_at: p.edited_at ? toISOStringSafe(p.edited_at) : null,
      is_hidden: p.is_hidden,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
      deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : null,
    })) satisfies IEconPoliticalForumPost[];

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    } satisfies IPageIEconPoliticalForumPost;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
