import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardSearchPosts(props: {
  body: IDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  const {
    page,
    limit,
    search,
    discussion_board_channel_id,
    discussion_board_section_id,
    actor_type,
    status,
    is_pinned,
    is_locked,
    created_after,
    created_before,
    order_by,
    order_direction,
  } = props.body;

  const skip = (page - 1) * limit;

  // Build WHERE conditions with proper Prisma type
  const where: Prisma.discussion_board_postsWhereInput = {
    // Basic status filter (exclude deleted posts)
    status: { not: "deleted" },
  };

  // Text search on title and content
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  // Channel filter
  if (discussion_board_channel_id) {
    where.discussion_board_channel_id = discussion_board_channel_id;
  }

  // Section filter
  if (discussion_board_section_id) {
    where.discussion_board_section_id = discussion_board_section_id;
  }

  // Actor type filter
  if (actor_type) {
    where.actor_type = actor_type;
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Pin status filter
  if (is_pinned !== undefined) {
    where.is_pinned = is_pinned;
  }

  // Lock status filter
  if (is_locked !== undefined) {
    where.is_locked = is_locked;
  }

  // Date range filters - handle as ISO strings
  if (created_after || created_before) {
    where.created_at = {};
    if (created_after) {
      where.created_at.gte = created_after;
    }
    if (created_before) {
      where.created_at.lte = created_before;
    }
  }

  // Build ORDER BY
  const orderBy: Record<string, "asc" | "desc"> = {};
  const sortField = order_by || "created_at";
  const sortDirection = order_direction || "desc";

  if (sortField === "title") {
    orderBy.title = sortDirection;
  } else if (sortField === "published_at") {
    orderBy.published_at = sortDirection;
  } else if (sortField === "updated_at") {
    orderBy.updated_at = sortDirection;
  } else {
    orderBy.created_at = sortDirection;
  }

  // Handle pin priority sorting - remove redundant check
  orderBy.is_pinned = "desc";

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        actor_type: true,
        status: true,
        is_pinned: true,
        is_locked: true,
        created_at: true,
        updated_at: true,
        published_at: true,
        discussion_board_channel_id: true,
        discussion_board_section_id: true,
      },
    }),
    MyGlobal.prisma.discussion_board_posts.count({ where }),
  ]);

  // Convert to API response format
  const posts = data.map((post) => ({
    id: post.id as string & tags.Format<"uuid">,
    type: "post",
    title: post.title,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: posts,
  };
}
