import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReplies";

export async function getEconomicBoardPostsPostIdRepliesReplyId(props: {
  postId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardReplies> {
  // Validate that both postId and replyId are provided (guaranteed by OpenAPI schema)
  const { postId, replyId } = props;

  // Fetch the reply with its associated post to validate post status
  const reply = await MyGlobal.prisma.economic_board_replies.findUnique({
    where: {
      id: replyId,
      economic_board_post_id: postId,
    },
    include: {
      post: {
        select: {
          status: true,
        },
      },
    },
  });

  // If reply doesn't exist or parent post is not published, return 404
  if (!reply || reply.post.status !== "published") {
    throw new HttpException("Not Found", 404);
  }

  // Return the reply data with proper date-time string formatting
  // Prisma returns DateTime as Date objects, must convert to ISO string
  return {
    id: reply.id,
    economic_board_post_id: reply.economic_board_post_id,
    economic_board_guest_id: reply.economic_board_guest_id,
    content: reply.content,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
  };
}
