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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorAnalyticsPosts(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build complex where condition
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
    status: { not: "deleted" },
  };

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

  if (props.body.is_pinned !== undefined) {
    whereCondition.is_pinned = props.body.is_pinned;
  }

  if (props.body.is_locked !== undefined) {
    whereCondition.is_locked = props.body.is_locked;
  }

  if (props.body.created_after || props.body.created_before) {
    const createdAtCondition: Record<string, unknown> = {};
    if (props.body.created_after) {
      createdAtCondition.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      createdAtCondition.lte = props.body.created_before;
    }
    whereCondition.created_at = createdAtCondition;
  }

  // Handle search
  if (props.body.search) {
    whereCondition.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";
  orderBy[orderField] = orderDirection;

  // Execute main query
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_posts.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_posts.count({
      where: whereCondition,
    }),
  ]);

  // Transform to summary format
  const data = posts.map((post) => ({
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
    data,
  };
}
