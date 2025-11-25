import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReply";
import { IPageIDiscussionBoardCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentReply";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardCommentsCommentIdReplies(props: {
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReply.IRequest;
}): Promise<IPageIDiscussionBoardCommentReply.ISummary> {
  const { commentId, body } = props;

  // Validate comment existence
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Implement pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Fetch replies with count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_replies.findMany({
      where: { discussion_board_comment_id: commentId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_comment_replies.count({
      where: { discussion_board_comment_id: commentId },
    }),
  ]);

  // Transform data to summary format
  const records = data.map((reply) => ({
    id: reply.id,
    content: reply.content,
    createdAt: toISOStringSafe(reply.created_at),
    updatedAt: reply.updated_at ? toISOStringSafe(reply.updated_at) : undefined,
  }));

  // Return paginated response
  return {
    data: records,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
