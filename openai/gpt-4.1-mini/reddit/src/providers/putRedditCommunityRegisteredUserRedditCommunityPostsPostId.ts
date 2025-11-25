import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityPostsPostId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const existing = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  if (existing.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden: not the post owner", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.type !== undefined && { type: props.body.type }),
      ...(props.body.title !== undefined && { title: props.body.title }),
      // Nullable fields: explicitly set null if provided, else leave unchanged
      body:
        props.body.body === undefined
          ? existing.body
          : props.body.body === null
            ? null
            : props.body.body,
      link_url:
        props.body.link_url === undefined
          ? existing.link_url
          : props.body.link_url === null
            ? null
            : props.body.link_url,
      image_url:
        props.body.image_url === undefined
          ? existing.image_url
          : props.body.image_url === null
            ? null
            : props.body.image_url,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    reddit_community_registereduser_id:
      updated.reddit_community_registereduser_id,
    reddit_community_community_id: updated.reddit_community_community_id,
    reddit_community_registereduser_session_id:
      updated.reddit_community_registereduser_session_id,
    type: typia.assert<"link" | "text" | "image">(updated.type),
    title: updated.title,
    body: updated.body === null ? null : (updated.body ?? undefined),
    link_url:
      updated.link_url === null ? null : (updated.link_url ?? undefined),
    image_url:
      updated.image_url === null ? null : (updated.image_url ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === undefined
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
