import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostView";
import { IPageIDiscussionBoardPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostView";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorPostsPostIdViews(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPostView.IRequest;
}): Promise<IPageIDiscussionBoardPostView.ISummary> {
  // Verify the target post exists
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    discussion_board_post_id: props.postId,
    deleted_at: null,
  };

  // Apply member filter if provided
  if (props.body.member_id !== undefined && props.body.member_id !== null) {
    whereConditions.discussion_board_member_id = props.body.member_id;
  }

  // Apply date range filters
  if (props.body.date_from !== undefined || props.body.date_to !== undefined) {
    whereConditions.created_at = {};

    if (props.body.date_from !== undefined) {
      (whereConditions.created_at as any).gte = new Date(props.body.date_from);
    }

    if (props.body.date_to !== undefined) {
      (whereConditions.created_at as any).lte = new Date(props.body.date_to);
    }
  }

  // Calculate pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Determine sorting
  const orderBy: Record<string, unknown> = {};
  const orderDirection = props.body.order === "desc" ? "desc" : "asc";
  const orderField = props.body.order_by ?? "created_at";

  switch (orderField) {
    case "member":
      orderBy.member = { username: orderDirection };
      break;
    case "created_at":
    default:
      orderBy.created_at = orderDirection;
      break;
  }

  // Execute concurrent queries
  const [views, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_post_views.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_post_views.count({
      where: whereConditions,
    }),
  ]);

  // Transform results
  const data = views.map((view) => ({
    id: view.id,
    member: {
      id: view.member.id,
      type: "member",
      name: view.member.display_name ?? view.member.username,
    },
    post: {
      id: view.post.id,
      type: "post",
      title: view.post.title,
    },
    created_at: toISOStringSafe(view.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
