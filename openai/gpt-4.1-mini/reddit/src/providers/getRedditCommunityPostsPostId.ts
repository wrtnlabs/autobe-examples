import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function getRedditCommunityPostsPostId(props: {
  postId: string;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_community_id: true,
      reddit_registered_user_id: true,
      post_type: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  const author =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: post.reddit_registered_user_id },
      select: {
        id: true,
      },
    });

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  return {
    id: post.id,
    community_code: post.reddit_community_id satisfies string as string,
    type: typia.assert<"link" | "text" | "image">(post.post_type),
    title: post.title satisfies string as string,
    content:
      post.content !== null && post.content !== undefined ? post.content : "",
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    comments_count: 0,
    votes_count: 0,
    author: {
      id: author.id,
      username: "",
      profile_image_url: undefined,
    },
  } satisfies IRedditCommunityPost;
}
