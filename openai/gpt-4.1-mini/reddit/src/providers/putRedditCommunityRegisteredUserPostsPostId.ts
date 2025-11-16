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
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserPostsPostId(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
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
      deleted_at: true,
    },
  });

  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_registered_user_id !== props.registeredUser.id) {
    const moderator =
      await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
        where: {
          deleted_at: null,
        },
      });

    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }

  const updated = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      post_type: typia.assert<"link" | "text" | "image">(
        props.body.type ?? post.post_type,
      ),
      title: props.body.title ?? post.title,
      content:
        props.body.content === undefined ? post.content : props.body.content,
      deleted_at:
        props.body.deleted_at === undefined
          ? post.deleted_at
          : props.body.deleted_at,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const [commentsCount, votesCount] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.count({
      where: { reddit_community_post_id: props.postId, deleted_at: null },
    }),
    MyGlobal.prisma.reddit_community_post_votes.count({
      where: { reddit_community_post_id: props.postId },
    }),
  ]);

  const authorUser =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: post.reddit_registered_user_id },
      select: { email: true },
    });

  if (!authorUser) {
    throw new HttpException("Author not found", 500);
  }

  return {
    id: updated.id,
    community_code: updated.reddit_community_id,
    author: {
      id: post.reddit_registered_user_id,
      username: authorUser.email,
      profile_image_url: undefined,
    },
    type: typia.assert<"link" | "text" | "image">(updated.post_type),
    title: updated.title,
    content: updated.content ?? "",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    comments_count: commentsCount,
    votes_count: votesCount,
  };
}
