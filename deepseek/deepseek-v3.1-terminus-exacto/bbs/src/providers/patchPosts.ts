import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchPosts(props: {
  body: IDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Validate channel exists if filtering by channel
  if (props.body.discussion_board_channel_id) {
    const channelExists =
      await MyGlobal.prisma.discussion_board_channels.findUnique({
        where: { id: props.body.discussion_board_channel_id, deleted_at: null },
      });
    if (!channelExists) {
      throw new HttpException("Specified channel does not exist", 400);
    }
  }

  // Validate section exists if filtering by section
  if (props.body.discussion_board_section_id) {
    const sectionExists =
      await MyGlobal.prisma.discussion_board_sections.findUnique({
        where: { id: props.body.discussion_board_section_id, deleted_at: null },
      });
    if (!sectionExists) {
      throw new HttpException("Specified section does not exist", 400);
    }
  }

  // Build where condition with proper typing
  const whereCondition: Prisma.discussion_board_postsWhereInput = {
    deleted_at: null,
  };

  // Search term filtering
  if (props.body.search) {
    whereCondition.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply filters
  if (props.body.discussion_board_channel_id) {
    whereCondition.discussion_board_channel_id =
      props.body.discussion_board_channel_id;
  }

  if (props.body.discussion_board_section_id) {
    whereCondition.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }

  if (props.body.actor_type) {
    whereCondition.actor_type = props.body.actor_type;
  }

  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  if (props.body.is_pinned !== undefined && props.body.is_pinned !== null) {
    whereCondition.is_pinned = props.body.is_pinned;
  }

  if (props.body.is_locked !== undefined && props.body.is_locked !== null) {
    whereCondition.is_locked = props.body.is_locked;
  }

  // Date range filtering
  if (props.body.created_after || props.body.created_before) {
    whereCondition.created_at = {};
    if (props.body.created_after) {
      whereCondition.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      whereCondition.created_at.lte = props.body.created_before;
    }
  }

  // Build order by condition
  const orderBy: Prisma.discussion_board_postsOrderByWithRelationInput = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";
  orderBy[orderField] = orderDirection;

  try {
    // Execute concurrent queries for data and count
    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_posts.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy,
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: whereCondition,
      }),
    ]);

    // Transform results to match ISummary interface
    const transformedData = data.map((post) => ({
      id: post.id,
      type: "post",
      title: post.title,
    }));

    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: transformedData,
    };
  } catch (error) {
    throw new HttpException("Failed to search posts", 500);
  }
}
