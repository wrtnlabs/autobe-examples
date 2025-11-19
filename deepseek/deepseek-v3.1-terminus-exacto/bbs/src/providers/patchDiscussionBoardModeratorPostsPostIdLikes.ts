import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostLike";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostLike";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorPostsPostIdLikes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPostLike.IRequest;
}): Promise<IPageIDiscussionBoardPostLike.ISummary> {
  // Verify the post exists
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    discussion_board_post_id: props.postId,
    deleted_at: null,
  };

  // Apply member filter if specified
  if (props.body.member) {
    whereConditions.discussion_board_member_id = props.body.member.id;
  }

  // Apply date range filters using string comparison since dates are stored as strings
  if (props.body.date_from || props.body.date_to) {
    const createdAtCondition: Record<string, string> = {};
    if (props.body.date_from) {
      createdAtCondition.gte = props.body.date_from;
    }
    if (props.body.date_to) {
      createdAtCondition.lte = props.body.date_to;
    }
    whereConditions.created_at = createdAtCondition;
  }

  // Determine sorting
  const orderBy: Record<string, string> = {};
  if (props.body.order_by === "member") {
    orderBy.discussion_board_member_id = props.body.order ?? "asc";
  } else if (props.body.order_by === "created_at") {
    orderBy.created_at = props.body.order ?? "desc";
  } else {
    // Default sorting
    orderBy.created_at = "desc";
  }

  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Execute paginated query
  const [likes, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_post_likes.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        member: {
          select: {
            id: true,
            username: true,
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
    MyGlobal.prisma.discussion_board_post_likes.count({
      where: whereConditions,
    }),
  ]);

  // Transform results
  const data = likes.map((like) => ({
    id: like.id,
    member: {
      id: like.member.id,
      type: "member",
      name: like.member.username,
    },
    post: {
      id: like.post.id,
      type: "post",
      title: like.post.title,
    },
    created_at: toISOStringSafe(like.created_at),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
