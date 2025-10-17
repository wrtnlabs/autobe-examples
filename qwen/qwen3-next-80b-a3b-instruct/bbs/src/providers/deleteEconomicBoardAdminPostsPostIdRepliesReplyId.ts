import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicBoardAdminPostsPostIdRepliesReplyId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the reply exists and get its post_id
  const reply = await MyGlobal.prisma.economic_board_replies.findUniqueOrThrow({
    where: {
      id: props.replyId,
    },
  });

  // Verify the reply belongs to the specified post
  if (reply.economic_board_post_id !== props.postId) {
    throw new HttpException("Reply does not belong to the specified post", 404);
  }

  // Delete the reply (hard delete - no soft-delete field exists)
  await MyGlobal.prisma.economic_board_replies.delete({
    where: {
      id: props.replyId,
    },
  });

  // Decrement the reply_count on the parent post
  await MyGlobal.prisma.economic_board_posts.update({
    where: {
      id: props.postId,
    },
    data: {
      reply_count: {
        decrement: 1,
      },
    },
  });
}
