import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumBookmark";
import { IPageIEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchEconPoliticalForumRegisteredUserBookmarks(props: {
  registeredUser: RegistereduserPayload;
  body: IEconPoliticalForumBookmark.IRequest;
}): Promise<IPageIEconPoliticalForumBookmark.ISummary> {
  const { registeredUser, body } = props;

  if (!registeredUser || !registeredUser.id) {
    throw new HttpException("Unauthorized", 401);
  }

  // Pagination defaults and limits
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  if (page < 1 || limit < 1) {
    throw new HttpException("Bad Request: invalid pagination parameters", 400);
  }

  // Validate sort_by and order
  const sortBy = body.sort_by ?? "created_at";
  if (sortBy !== "created_at" && sortBy !== "updated_at") {
    throw new HttpException("Bad Request: invalid sort_by", 400);
  }
  const order = body.order === "asc" ? "asc" : "desc";

  try {
    // If threadId filter provided, resolve post ids for that thread
    let postIds: string[] | null = null;
    if (body.threadId !== undefined && body.threadId !== null) {
      const posts = await MyGlobal.prisma.econ_political_forum_posts.findMany({
        where: { thread_id: body.threadId },
        select: { id: true },
      });
      postIds = posts.map((p) => p.id);
      if (postIds.length === 0) {
        // No posts for that thread -> empty page
        return {
          pagination: {
            current: page,
            limit,
            records: 0,
            pages: 0,
          },
          data: [],
        };
      }
    }

    // Build where clause inline
    const whereBase = {
      registereduser_id: registeredUser.id,
      ...(body.includeDeleted ? {} : { deleted_at: null }),
      ...(body.postId !== undefined &&
        body.postId !== null && { post_id: body.postId }),
      ...(postIds && postIds.length > 0 && { post_id: { in: postIds } }),
      ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
      (body.createdTo !== undefined && body.createdTo !== null)
        ? {
            created_at: {
              ...(body.createdFrom !== undefined &&
                body.createdFrom !== null && { gte: body.createdFrom }),
              ...(body.createdTo !== undefined &&
                body.createdTo !== null && { lte: body.createdTo }),
            },
          }
        : {}),
    };

    // Cursor-based pagination support
    const cursor = body.cursor ?? null;
    const createdAtCursorFilter = cursor
      ? order === "desc"
        ? { created_at: { lt: cursor } }
        : { created_at: { gt: cursor } }
      : {};

    // Final where combining base and cursor
    const finalWhere = {
      ...whereBase,
      ...createdAtCursorFilter,
    };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_bookmarks.findMany({
        where: finalWhere,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          post_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      MyGlobal.prisma.econ_political_forum_bookmarks.count({
        where: whereBase,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
    }));

    const pages = Math.ceil(total / limit);

    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages,
      },
      data,
    };
  } catch (err) {
    // Unexpected errors
    throw new HttpException("Internal Server Error", 500);
  }
}
