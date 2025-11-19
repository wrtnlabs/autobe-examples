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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberPosts(props: {
  member: MemberPayload;
  body: IDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build WHERE conditions in a structured way
  const buildWhereConditions = () => {
    const conditions: Prisma.discussion_board_postsWhereInput = {
      deleted_at: null,
      status: { in: ["published", "archived"] },
    };

    // Search functionality - use OR for title/content search
    if (props.body.search) {
      conditions.OR = [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ];
    }

    // Direct field filters
    if (props.body.discussion_board_channel_id) {
      conditions.discussion_board_channel_id =
        props.body.discussion_board_channel_id;
    }

    if (props.body.discussion_board_section_id) {
      conditions.discussion_board_section_id =
        props.body.discussion_board_section_id;
    }

    if (props.body.actor_type) {
      conditions.actor_type = props.body.actor_type;
    }

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (props.body.is_pinned !== undefined) {
      conditions.is_pinned = props.body.is_pinned;
    }

    if (props.body.is_locked !== undefined) {
      conditions.is_locked = props.body.is_locked;
    }

    // Date range filtering
    if (props.body.created_after || props.body.created_before) {
      conditions.created_at = {};
      if (props.body.created_after) {
        conditions.created_at.gte = props.body.created_after;
      }
      if (props.body.created_before) {
        conditions.created_at.lte = props.body.created_before;
      }
    }

    return conditions;
  };

  const whereConditions = buildWhereConditions();

  // Determine sorting
  const determineOrderBy = () => {
    const orderDirection = props.body.order_direction ?? "desc";

    switch (props.body.order_by) {
      case "created_at":
        return { created_at: orderDirection };
      case "updated_at":
        return { updated_at: orderDirection };
      case "published_at":
        return { published_at: orderDirection };
      case "title":
        return { title: orderDirection };
      default:
        return { created_at: "desc" as Prisma.SortOrder };
    }
  };

  const orderBy = determineOrderBy();

  // Execute queries concurrently for better performance
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

  // Transform data to match the API contract
  const transformedData: IDiscussionBoardPost.ISummary[] = data.map((post) => ({
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
    data: transformedData,
  };
}
