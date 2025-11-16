import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_community_member_id !== props.member.id) {
    throw new HttpException("You can only delete your own posts", 403);
  }

  if (post.deleted_at !== null) {
    throw new HttpException("Post is already deleted", 400);
  }

  const now = new Date();
  const deletedPost = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: now,
    },
  });

  return {
    id: deletedPost.id,
    community_id: deletedPost.reddit_community_community_id,
    member_id: deletedPost.reddit_community_member_id,
    title: deletedPost.title,
    post_type: deletedPost.post_type satisfies string as
      | "link"
      | "text"
      | "image",
    body: deletedPost.body,
    url: deletedPost.url,
    image_url: deletedPost.image_url,
    edited: deletedPost.edited,
    created_at: toISOStringSafe(deletedPost.created_at),
    updated_at: deletedPost.updated_at
      ? toISOStringSafe(deletedPost.updated_at)
      : null,
    deleted_at: toISOStringSafe(deletedPost.deleted_at!),
  };
}
