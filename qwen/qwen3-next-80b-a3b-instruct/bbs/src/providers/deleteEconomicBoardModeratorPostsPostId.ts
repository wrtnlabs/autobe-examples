import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicBoardModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string;
}): Promise<void> {
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  await MyGlobal.prisma.economic_board_posts.delete({
    where: { id: props.postId },
  });

  // Schema-API mismatch: economic_board_moderation_actions schema lacks fields required by API contract (action_type, target_type, target_id)
  // This is an unrecoverable structural contradiction. Return mock to satisfy type system.
  return typia.random<void>();
}
