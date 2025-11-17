import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityPostsPostId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: { id: props.postId, deleted_at: null },
  });

  if (post === null) {
    throw new HttpException("Post not found", 404);
  }

  return {
    id: post.id,
    reddit_community_registereduser_id: post.reddit_community_registereduser_id,
    reddit_community_community_id: post.reddit_community_community_id,
    reddit_community_registereduser_session_id:
      post.reddit_community_registereduser_session_id,
    type: typia.assert<"link" | "text" | "image">(post.type),
    title: post.title,
    body: post.body ?? null,
    link_url: post.link_url ?? null,
    image_url: post.image_url ?? null,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at:
      post.deleted_at === null ? null : toISOStringSafe(post.deleted_at),
  };
}
