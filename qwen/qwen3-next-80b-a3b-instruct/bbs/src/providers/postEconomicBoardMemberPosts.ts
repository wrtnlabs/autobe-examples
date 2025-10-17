import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconomicBoardMemberPosts(props: {
  member: MemberPayload;
  body: IEconomicBoardPost.ICreate;
}): Promise<IEconomicBoardPost> {
  // Verify topic exists and is active in schema
  const topic = await MyGlobal.prisma.economic_board_topics.findUniqueOrThrow({
    where: {
      id: props.body.economic_board_topics_id,
      is_active: true,
    },
  });

  // Generate system timestamp for creation and update times
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create post with system-generated fields
  const created = await MyGlobal.prisma.economic_board_posts.create({
    data: {
      // Required fields from input
      economic_board_topics_id: props.body.economic_board_topics_id,
      subject: props.body.subject,
      content: props.body.content,

      // System-generated fields
      id: v4() as string & tags.Format<"uuid">,
      created_at: now,
      updated_at: now,
      status: "pending" as const,
      reply_count: 0,
      edited: false,
      edited_at: null,

      // For member posts, author_hash is null (identified by member ID)
      // This follows the Prisma schema and API contract
      author_hash: null,

      // These are populated only by admin moderation actions
      admin_id: null,
      moderation_reason: null,
    },
  });

  // Return the fully formed post object matching the IEconomicBoardPost interface
  return {
    id: created.id,
    economic_board_topics_id: created.economic_board_topics_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    status: created.status satisfies string as "pending", // Literal type enforced
    subject: created.subject,
    content: created.content,
    reply_count: created.reply_count,
    edited: created.edited,
    edited_at:
      created.edited_at === null ? null : toISOStringSafe(created.edited_at),
    author_hash: created.author_hash,
    admin_id: created.admin_id,
    moderation_reason: created.moderation_reason,
  };
}
