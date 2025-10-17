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

export async function patchEconPoliticalForumTagsTagIdThreads(props: {
  tagId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumThread.IRequest;
}): Promise<IPageIEconPoliticalForumThread.ISummary> {
  const { tagId, body } = props;

  // Pagination defaults and limits
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  if (Number.isNaN(page) || Number.isNaN(limit) || page <= 0 || limit <= 0) {
    throw new HttpException("Bad Request: invalid pagination parameters", 400);
  }

  // Verify tag existence (public endpoint must exclude soft-deleted tags)
  const tag = await MyGlobal.prisma.econ_political_forum_tags.findUnique({
    where: { id: tagId },
  });
  if (!tag || tag.deleted_at) {
    throw new HttpException("Tag not found", 404);
  }

  // Get thread IDs that are actively mapped to the tag
  const mappings =
    await MyGlobal.prisma.econ_political_forum_thread_tags.findMany({
      where: { tag_id: tagId, deleted_at: null },
      select: { thread_id: true },
    });

  const threadIds = mappings.map((m) => m.thread_id);
  if (threadIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    } as unknown as IPageIEconPoliticalForumThread.ISummary;
  }

  // Build thread where condition inline
  const whereCondition: Record<string, unknown> = {
    id: { in: threadIds },
    deleted_at: null,
    ...(body.category_id !== undefined &&
      body.category_id !== null && { category_id: body.category_id }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    ...(body.q !== undefined &&
      body.q !== null && { title: { contains: body.q } }),
    ...(body.pinned !== undefined && { pinned: body.pinned }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
  };

  // Created range
  if (body.created_from !== undefined && body.created_from !== null) {
    whereCondition.created_at ??= {};
    Object.assign(whereCondition.created_at as Record<string, unknown>, {
      gte: body.created_from,
    });
  }
  if (body.created_to !== undefined && body.created_to !== null) {
    whereCondition.created_at ??= {};
    Object.assign(whereCondition.created_at as Record<string, unknown>, {
      lte: body.created_to,
    });
  }

  // Cursor support: created_at less-than for newest-first continuation
  if (body.cursor !== undefined && body.cursor !== null) {
    whereCondition.created_at ??= {};
    Object.assign(whereCondition.created_at as Record<string, unknown>, {
      lt: body.cursor,
    });
  }

  // Validate sort_by and map to orderBy
  const supportedSorts = new Set([
    "relevance",
    "newest",
    "oldest",
    "updated",
    "pinned",
  ]);
  const requestedSort = body.sort_by ?? "newest";
  if (requestedSort && !supportedSorts.has(requestedSort)) {
    // Fallback: unsupported aggregate sorts (e.g., mostVoted) -> newest
    // Return 400 only for truly invalid values (not aggregation that we fallback)
    // Here treat unknown strings as bad request
    throw new HttpException("Bad Request: unsupported sort option", 400);
  }

  const orderByParam:
    | Prisma.econ_political_forum_threadsOrderByWithRelationInput
    | Prisma.econ_political_forum_threadsOrderByWithRelationInput[]
    | undefined =
    requestedSort === "oldest"
      ? { created_at: "asc" as Prisma.SortOrder }
      : requestedSort === "updated"
        ? { updated_at: "desc" as Prisma.SortOrder }
        : requestedSort === "pinned"
          ? undefined
          : { created_at: "desc" as Prisma.SortOrder };

  // Count total matching threads
  const total = await MyGlobal.prisma.econ_political_forum_threads.count({
    where: whereCondition,
  });

  // Pagination: if cursor provided, use take limit and ignore skip/page
  const take = limit;
  const skip = body.cursor ? 0 : (page - 1) * limit;

  // Fetch threads. For pinned sort we prefer pinned desc then newest
  const rows = await MyGlobal.prisma.econ_political_forum_threads.findMany({
    where: whereCondition,
    orderBy:
      requestedSort === "pinned"
        ? ([
            { pinned: "desc" as Prisma.SortOrder },
            { created_at: "desc" as Prisma.SortOrder },
          ] as Prisma.econ_political_forum_threadsOrderByWithRelationInput[])
        : orderByParam,
    skip,
    take,
  });

  // Map to DTO, converting Date fields to ISO strings
  const data = rows.map((r) => {
    const summary: IEconPoliticalForumThread.ISummary = {
      id: r.id,
      category_id: r.category_id,
      author_id: r.author_id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      pinned: r.pinned,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    };
    return summary;
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  } as unknown as IPageIEconPoliticalForumThread.ISummary;
}
