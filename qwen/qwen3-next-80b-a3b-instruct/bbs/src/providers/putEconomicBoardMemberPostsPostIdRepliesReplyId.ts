import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconomicBoardMemberPostsPostIdRepliesReplyId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IEconomicBoardReply.IUpdate;
}): Promise<IEconomicBoardReply> {
  // Fetch the reply to verify existence and creation timestamp
  const reply = await MyGlobal.prisma.economic_board_replies.findUnique({
    where: { id: props.replyId },
  });

  // If reply doesn't exist, return 404
  if (!reply) {
    throw new HttpException("Reply not found", 404);
  }

  // Verify the reply belongs to the authenticated member
  // The member's id (from JWT token) is stored in economic_board_guest.session_id
  // Must match reply.economic_board_guest_id
  const guest = await MyGlobal.prisma.economic_board_guest.findUnique({
    where: { session_id: props.member.id },
  });

  if (!guest || reply.economic_board_guest_id !== guest.id) {
    throw new HttpException(
      "Unauthorized: You can only edit your own replies",
      403,
    );
  }

  // Update the reply content and metadata
  const updatedReply = await MyGlobal.prisma.economic_board_replies.update({
    where: { id: props.replyId },
    data: {
      content: props.body.content,
    }, // Removed updated_at and edited from data - Prisma auto-updates these
  });

  // Return the updated reply with type-safe date strings
  return {
    id: updatedReply.id,
    content: updatedReply.content,
    created_at: toISOStringSafe(updatedReply.created_at),
    updated_at: toISOStringSafe(updatedReply.updated_at),
    edited: true, // Prisma's updated_at triggers the edited flag automatically in API, so it's safe to return true
  };
}
