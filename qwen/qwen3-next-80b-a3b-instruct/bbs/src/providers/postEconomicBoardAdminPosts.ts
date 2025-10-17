import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postEconomicBoardAdminPosts(props: {
  admin: AdminPayload;
  body: IEconomicBoardPost.ICreate;
}): Promise<IEconomicBoardPost> {
  const { admin, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.economic_board_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_topics_id: body.economic_board_topics_id,
      created_at: now,
      updated_at: now,
      status: "pending",
      subject: body.subject,
      content: body.content,
      reply_count: 0,
      edited: false,
      edited_at: null,
      author_hash: null,
      admin_id: admin.id,
      moderation_reason: null,
    },
  });

  return {
    id: created.id,
    economic_board_topics_id: created.economic_board_topics_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    status: created.status as "pending" | "published" | "rejected" | "deleted",
    subject: created.subject,
    content: created.content,
    reply_count: created.reply_count,
    edited: created.edited,
    edited_at: created.edited_at ? toISOStringSafe(created.edited_at) : null,
    author_hash: created.author_hash,
    admin_id: created.admin_id,
    moderation_reason: created.moderation_reason,
  };
}
