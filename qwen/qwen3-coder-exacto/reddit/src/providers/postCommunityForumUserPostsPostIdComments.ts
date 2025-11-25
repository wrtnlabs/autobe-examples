import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserPostsPostIdComments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityForumPostComment.ICreate;
}): Promise<ICommunityForumPostComment> {
  // Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Create a new session record for this comment creation
  const now = new Date();
  const session = await MyGlobal.prisma.community_forum_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_user_id: props.user.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      ), // 1 week from now
    },
  });

  // Create the comment
  const created = await MyGlobal.prisma.community_forum_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_post_id: props.postId,
      community_forum_user_id: props.user.id,
      community_forum_user_session_id: session.id,
      body: props.body.body,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  // Return the created comment in the API format
  return {
    id: created.id,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: undefined,
    deleted_at: null,
    community_forum_post_id: created.community_forum_post_id,
    community_forum_user_id: created.community_forum_user_id,
    parent_id: undefined,
  };
}
