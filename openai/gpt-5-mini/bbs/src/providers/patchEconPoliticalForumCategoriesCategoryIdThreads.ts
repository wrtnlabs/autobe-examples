import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import { IPageIEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumThread";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPoliticalForumCategoriesCategoryIdThreads(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumThread.IRequest;
}): Promise<IPageIEconPoliticalForumThread.ISummary> {
  const { categoryId, body } = props;

  try {
    // Verify category existence
    const category =
      await MyGlobal.prisma.econ_political_forum_categories.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
    if (!category) throw new HttpException("Not Found", 404);

    // Pagination defaults and clamping
    const page = body.page ?? 1;
    let limit = body.limit ?? 20;
    if (limit > 100) limit = 100;
    const take = Number(limit);
    const current = Number(page);
    const skip = (current - 1) * take;

    // Build orderBy inline (no variable extraction for Prisma)
    const orderBy =
      body.sort_by === "oldest"
        ? { created_at: "asc" }
        : body.sort_by === "updated"
          ? { updated_at: "desc" }
          : body.sort_by === "pinned"
            ? [{ pinned: "desc" }, { created_at: "desc" }]
            : // newest or relevance fallback
              { created_at: "desc" };

    const useCursor = body.cursor !== undefined && body.cursor !== null;

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_threads.findMany({
        where: {
          category_id: categoryId,
          deleted_at: null,
          ...(body.status === undefined && { status: { not: "pending" } }),
          ...(body.status !== undefined &&
            body.status !== null && { status: body.status }),
          ...(body.author_id !== undefined &&
            body.author_id !== null && { author_id: body.author_id }),
          ...(body.pinned !== undefined && { pinned: body.pinned }),
          ...(body.q !== undefined &&
            body.q !== null && { title: { contains: body.q } }),
          ...(body.tag_id !== undefined &&
            body.tag_id !== null && {
              econ_political_forum_thread_tags: {
                some: { tag_id: body.tag_id },
              },
            }),
          ...((body.created_from !== undefined && body.created_from !== null) ||
          (body.created_to !== undefined && body.created_to !== null)
            ? {
                created_at: {
                  ...(body.created_from !== undefined &&
                    body.created_from !== null && { gte: body.created_from }),
                  ...(body.created_to !== undefined &&
                    body.created_to !== null && { lte: body.created_to }),
                },
              }
            : {}),
        },
        orderBy: orderBy as any,
        ...(useCursor
          ? { cursor: { id: body.cursor }, skip: 1, take }
          : { skip: skip, take }),
        select: {
          id: true,
          category_id: true,
          author_id: true,
          title: true,
          slug: true,
          status: true,
          pinned: true,
          created_at: true,
          updated_at: true,
        },
      }),

      MyGlobal.prisma.econ_political_forum_threads.count({
        where: {
          category_id: categoryId,
          deleted_at: null,
          ...(body.status === undefined && { status: { not: "pending" } }),
          ...(body.status !== undefined &&
            body.status !== null && { status: body.status }),
          ...(body.author_id !== undefined &&
            body.author_id !== null && { author_id: body.author_id }),
          ...(body.pinned !== undefined && { pinned: body.pinned }),
          ...(body.q !== undefined &&
            body.q !== null && { title: { contains: body.q } }),
          ...(body.tag_id !== undefined &&
            body.tag_id !== null && {
              econ_political_forum_thread_tags: {
                some: { tag_id: body.tag_id },
              },
            }),
          ...((body.created_from !== undefined && body.created_from !== null) ||
          (body.created_to !== undefined && body.created_to !== null)
            ? {
                created_at: {
                  ...(body.created_from !== undefined &&
                    body.created_from !== null && { gte: body.created_from }),
                  ...(body.created_to !== undefined &&
                    body.created_to !== null && { lte: body.created_to }),
                },
              }
            : {}),
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      category_id: r.category_id,
      author_id: r.author_id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      pinned: r.pinned,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    }));

    return {
      pagination: {
        current: current,
        limit: take,
        records: total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
      data,
    };
  } catch (err: unknown) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
