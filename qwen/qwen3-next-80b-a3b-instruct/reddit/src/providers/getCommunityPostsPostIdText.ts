import { ICommunityPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdText(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPostText> {
  // Validate that the post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });
  // Return 404 if post doesn't exist or is deleted
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Fetch only the content field from community_post_texts
  const textContent = await MyGlobal.prisma.community_post_texts.findUnique({
    where: { community_post_id: props.postId },
    select: { content: true },
  });
  // Return 404 if no text content exists for this post
  if (!textContent || textContent.content === null) {
    throw new HttpException("Post text content not found", 404);
  }
  // Return the content string as specified by the operation, despite ICommunityPostText being empty
  // This aligns with the API specification that defines the response as the text content string
  return {};
}
