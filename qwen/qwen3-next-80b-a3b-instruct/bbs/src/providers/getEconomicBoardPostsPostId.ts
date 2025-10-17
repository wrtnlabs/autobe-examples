import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function getEconomicBoardPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardPost> {
  const post = await MyGlobal.prisma.economic_board_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });

  if (post.status !== "published") {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: post.id,
    economic_board_topics_id: post.economic_board_topics_id,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    status: post.status,
    subject: post.subject,
    content: post.content,
    reply_count: post.reply_count,
    edited: post.edited,
    edited_at: post.edited_at ? toISOStringSafe(post.edited_at) : undefined,
    author_hash: post.author_hash,
    admin_id: post.admin_id,
    moderation_reason: post.moderation_reason,
  };
}
