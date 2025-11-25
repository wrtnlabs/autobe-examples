import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorPostsPostIdComments(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  // Verify the post exists
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

  // Add search filter if provided
  if (props.body.search) {
    whereConditions.content = { contains: props.body.search };
  }

  // Add status filter if provided
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Add thread level filter if provided
  if (
    props.body.thread_level !== undefined &&
    props.body.thread_level !== null
  ) {
    whereConditions.thread_level = props.body.thread_level;
  }

  // Add author filter if provided
  if (props.body.author_id) {
    whereConditions.discussion_board_member_id = props.body.author_id;
  }

  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Sort configuration
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  orderBy[orderField] = orderDirection;

  // Execute queries concurrently
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
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
    MyGlobal.prisma.discussion_board_comments.count({
      where: whereConditions,
    }),
  ]);

  // Transform results
  const data = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    status: comment.status,
    thread_level: comment.thread_level,
    created_at: toISOStringSafe(comment.created_at),
    author: {
      id: comment.author.id,
      type: "member",
      name: comment.author.display_name ?? "",
    },
    post: {
      id: comment.post.id,
      type: "post",
      title: comment.post.title,
    },
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
