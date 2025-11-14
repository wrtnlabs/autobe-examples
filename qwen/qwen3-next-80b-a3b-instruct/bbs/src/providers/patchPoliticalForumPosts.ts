import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";
import { IPageIPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalForumPost";

export async function patchPoliticalForumPosts(props: {
  body: IPoliticalForumPost.IRequest;
}): Promise<IPageIPoliticalForumPost.ISummary> {
  // Parse the request body string into an object
  const query: any = JSON.parse(props.body);

  // Default pagination values (trusted - already validated)
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  // Default sort (trusted - already validated)
  const sort = query.sort ?? "created_at:desc";
  const [field, order] = sort.split(":") as [
    keyof IPoliticalForumPost.IRequest,
    "asc" | "desc",
  ];
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (field && order) {
    const orderValue = order satisfies "asc" | "desc" as "asc" | "desc";
    orderBy[typia.assert<string>(field)] = orderValue;
  }

  // Build where condition dynamically
  const where: Record<string, unknown> = {};

  // Filter by status if provided (trusted - already validated)
  if (query.status) {
    where.status = query.status;
  }

  // Full-text search on title and body if keyword provided (trusted - already validated)
  if (query.keyword) {
    where.OR = [
      { title: { contains: query.keyword, mode: "insensitive" } },
      { body: { contains: query.keyword, mode: "insensitive" } },
    ];
  }

  // Pagination offset
  const skip = (page - 1) * limit;

  // Execute concurrent queries
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.political_forum_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.political_forum_posts.count({ where }),
  ]);

  // Map to summary format
  const data = posts.map((post) => ({
    id: post.id,
    title: post.title,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
  }));

  return typia.assert<IPageIPoliticalForumPost.ISummary>({
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  });
}
