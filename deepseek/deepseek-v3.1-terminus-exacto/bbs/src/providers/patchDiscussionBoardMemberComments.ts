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

export async function patchDiscussionBoardMemberComments(props: {
  member: MemberPayload;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE conditions - ensure member can only see their own comments
  const whereConditions: Prisma.discussion_board_commentsWhereInput = {
    deleted_at: null,
    discussion_board_member_id: props.member.id,
    ...(props.body.search && {
      content: { contains: props.body.search },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.thread_level !== undefined && {
      thread_level: props.body.thread_level,
    }),
    ...(props.body.author_id &&
      props.body.author_id !== props.member.id && {
        discussion_board_member_id: props.body.author_id,
      }),
  };

  // Remove author_id condition if it matches current member (redundant)
  if (props.body.author_id === props.member.id) {
    delete whereConditions.discussion_board_member_id;
  }

  // Determine sorting
  const orderBy: Prisma.discussion_board_commentsOrderByWithRelationInput = {};
  if (props.body.order_by) {
    orderBy[props.body.order_by] = props.body.order ?? "desc";
  } else {
    orderBy.created_at = "desc";
  }

  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
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

  // Transform results to match DTO structure
  const transformedData = data.map((comment) => ({
    id: comment.id,
    content: comment.content,
    status: comment.status,
    thread_level: comment.thread_level,
    created_at: toISOStringSafe(comment.created_at),
    author: {
      id: comment.author.id,
      type: "member",
      name: "Member", // Default name since actual name field doesn't exist in schema
    },
    post: {
      id: comment.post.id,
      type: "post",
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
    data: transformedData,
  };
}
