import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentLike";
import { IPageIDiscussionBoardCommentLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentLike";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberCommentsCommentIdLikes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentLike.IRequest;
}): Promise<IPageIDiscussionBoardCommentLike> {
  // Verify the comment exists and is accessible with its relations
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
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
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build orderBy clause
  const orderBy: Record<string, "asc" | "desc"> = {};
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.order ?? "desc";

  if (sortField === "created_at" || sortField === "updated_at") {
    orderBy[sortField] = sortOrder;
  }

  // Execute paginated query
  const [likes, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_likes.findMany({
      where: {
        discussion_board_comment_id: props.commentId,
        deleted_at: null,
      },
      include: {
        member: {
          select: {
            id: true,
            display_name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_comment_likes.count({
      where: {
        discussion_board_comment_id: props.commentId,
        deleted_at: null,
      },
    }),
  ]);

  // Transform results to match API interface
  const data = likes.map((like) => ({
    id: like.id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(like.created_at),
    updated_at: toISOStringSafe(like.updated_at),
    deleted_at: like.deleted_at ? toISOStringSafe(like.deleted_at) : undefined,
    member: {
      id: like.member.id as string & tags.Format<"uuid">,
      type: "member",
      name: like.member.display_name ?? "",
    },
    comment: {
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.content,
      status: comment.status,
      thread_level: comment.thread_level,
      created_at: toISOStringSafe(comment.created_at),
      author: {
        id: comment.author.id as string & tags.Format<"uuid">,
        type: "member",
        name: comment.author.display_name ?? "",
      },
      post: {
        id: comment.post.id as string & tags.Format<"uuid">,
        type: "post",
        title: comment.post.title,
      },
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
