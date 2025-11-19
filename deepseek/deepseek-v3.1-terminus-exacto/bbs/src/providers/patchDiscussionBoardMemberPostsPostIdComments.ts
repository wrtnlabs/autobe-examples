import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  // Verify the post exists and is accessible to the member
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
      status: "published",
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Validate pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build where conditions with proper typing
  const whereConditions: Prisma.discussion_board_commentsWhereInput = {
    discussion_board_post_id: props.postId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.thread_level !== undefined &&
      props.body.thread_level !== null && {
        thread_level: props.body.thread_level,
      }),
    ...(props.body.author_id && {
      discussion_board_member_id: props.body.author_id,
    }),
  };

  // Build orderBy with fallback
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order === "desc" ? "desc" : "asc";

  // Execute concurrent queries for efficiency
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        [orderField]: orderDirection,
      },
      include: {
        author: {
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
            actor_type: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match API contract
  const data = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    status: comment.status,
    thread_level: comment.thread_level,
    created_at: toISOStringSafe(comment.created_at),
    author: {
      id: comment.author.id,
      type: "member",
      name: comment.author.display_name ?? comment.author.username,
    },
    post: {
      id: comment.post.id,
      type: comment.post.actor_type,
      title: comment.post.title,
    },
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
