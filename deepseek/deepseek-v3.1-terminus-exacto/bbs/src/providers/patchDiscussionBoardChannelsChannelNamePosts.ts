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

export async function patchDiscussionBoardChannelsChannelNamePosts(props: {
  channelName: string;
  body: IDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  // Validate channel exists and is active
  const channel = await MyGlobal.prisma.discussion_board_channels.findFirst({
    where: {
      name: props.channelName,
      status: "active",
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found or inactive", 404);
  }

  // Calculate pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Record<string, unknown> = {
    discussion_board_channel_id: channel.id,
    deleted_at: null,
  };

  // Add search filter with optimized OR condition
  if (props.body.search && props.body.search.trim().length > 0) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add channel filter
  if (props.body.discussion_board_channel_id) {
    whereConditions.discussion_board_channel_id =
      props.body.discussion_board_channel_id;
  }

  // Add section filter
  if (props.body.discussion_board_section_id) {
    whereConditions.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }

  // Add actor type filter
  if (props.body.actor_type) {
    whereConditions.actor_type = props.body.actor_type;
  }

  // Add status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Add pinned filter
  if (props.body.is_pinned !== undefined) {
    whereConditions.is_pinned = props.body.is_pinned;
  }

  // Add locked filter
  if (props.body.is_locked !== undefined) {
    whereConditions.is_locked = props.body.is_locked;
  }

  // Add date range filters
  if (props.body.created_after || props.body.created_before) {
    whereConditions.created_at = {} satisfies Record<string, unknown> as Record<
      string,
      unknown
    >;
    if (props.body.created_after) {
      (whereConditions.created_at as Record<string, unknown>).gte =
        props.body.created_after;
    }
    if (props.body.created_before) {
      (whereConditions.created_at as Record<string, unknown>).lte =
        props.body.created_before;
    }
  }

  // Validate and build order by
  const validOrderFields = [
    "created_at",
    "updated_at",
    "published_at",
    "title",
  ];
  const orderBy: Record<string, unknown> = {};
  const orderDirection = props.body.order_direction || "desc";

  if (props.body.order_by && validOrderFields.includes(props.body.order_by)) {
    orderBy[props.body.order_by] = orderDirection;
  } else {
    // Default ordering by creation date descending
    orderBy.created_at = "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_posts.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_posts.count({
      where: whereConditions,
    }),
  ]);

  // Convert to API response format
  const posts = data.map((post) => ({
    id: post.id,
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
