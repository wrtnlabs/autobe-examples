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

export async function postEconomicBoardMemberPostsPostIdReplies(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicBoardReply.ICreate;
}): Promise<IEconomicBoardReply> {
  // Verify the post exists (hard delete - no soft delete field in schema)
  const post = await MyGlobal.prisma.economic_board_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });

  // Create an anonymous guest record if one doesn't exist for this member's session
  // We query for an existing guest by session_id, but session_id is not available in props
  // So we create a new guest for this member's session
  const guest = await MyGlobal.prisma.economic_board_guest.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      session_id: v4() as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
      last_active: toISOStringSafe(new Date()),
    },
  });

  // Create the reply using the guest and post references
  const reply = await MyGlobal.prisma.economic_board_replies.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_post_id: props.postId,
      economic_board_guest_id: guest.id,
      content: props.body.content,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Increment the reply count on the parent post
  await MyGlobal.prisma.economic_board_posts.update({
    where: { id: props.postId },
    data: {
      reply_count: { increment: 1 },
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the reply in the expected DTO format
  return {
    id: reply.id,
    content: reply.content,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    edited: false,
  };
}
