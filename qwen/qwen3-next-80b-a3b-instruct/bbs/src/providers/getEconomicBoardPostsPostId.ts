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
  postId: string;
}): Promise<IEconomicBoardPost> {
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Only published posts are visible — all others (pending, rejected, deleted) return 404
  if (post.status !== "published") {
    throw new HttpException("Post not found", 404);
  }

  // Deleted posts are not accessible — return 404 even if status was published
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  // Format all datetime fields according to DTO requirements
  return typia.assert<IEconomicBoardPost>({
    id: post.id,
    title: post.title,
    body: post.body,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
    citizen_id: post.citizen_id,
    moderator_approved_id: post.moderator_approved_id,
    moderator_rejected_id: post.moderator_rejected_id,
    moderator_deleted_id: post.moderator_deleted_id,
    category_id: post.category_id,
  });
}
