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

export async function putRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const existing = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!existing) {
    throw new HttpException("Post not found", 404);
  }

  if (existing.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.url !== undefined && { url: props.body.url }),
      edited: true,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    community_id: updated.reddit_community_community_id,
    member_id: updated.reddit_community_member_id,
    title: updated.title,
    post_type: typia.assert<"link" | "text" | "image">(updated.post_type),
    body: updated.body ?? undefined,
    url: updated.url ?? undefined,
    image_url: updated.image_url ?? undefined,
    edited: updated.edited,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
