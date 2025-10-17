import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPortalMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPortalPost.IUpdate;
}): Promise<ICommunityPortalPost> {
  const { member, postId, body } = props;

  // 1. Fetch the post and ensure it exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      community_id: true,
      author_user_id: true,
      post_type: true,
      title: true,
      body: true,
      link_url: true,
      image_url: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // 2. Authorization: author or community/global moderator
  const isAuthor =
    post.author_user_id !== null && post.author_user_id === member.id;
  let isModerator = false;

  if (!isAuthor) {
    const mod = await MyGlobal.prisma.community_portal_moderators.findFirst({
      where: {
        user_id: member.id,
        is_active: true,
        OR: [{ community_id: post.community_id }, { community_id: null }],
      },
      select: { id: true },
    });
    isModerator = !!mod;
  }

  if (!isAuthor && !isModerator) {
    throw new HttpException(
      "Unauthorized: You can only update your own posts or act as moderator",
      403,
    );
  }

  // 3. Business validation: post_type change requires matching content
  if (body.post_type !== undefined && body.post_type !== post.post_type) {
    const newType = body.post_type;
    if (newType === "text") {
      if (body.body === undefined) {
        throw new HttpException(
          'Bad Request: Changing post_type to "text" requires providing body',
          400,
        );
      }
    } else if (newType === "link") {
      if (body.link_url === undefined) {
        throw new HttpException(
          'Bad Request: Changing post_type to "link" requires providing link_url',
          400,
        );
      }
    } else if (newType === "image") {
      if (body.image_url === undefined) {
        throw new HttpException(
          'Bad Request: Changing post_type to "image" requires providing image_url',
          400,
        );
      }
    }
  }

  // 4. Prepare updated_at and perform update inline
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.community_portal_posts.update({
    where: { id: postId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.link_url !== undefined && { link_url: body.link_url }),
      ...(body.image_url !== undefined && { image_url: body.image_url }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.post_type !== undefined && { post_type: body.post_type }),
      updated_at: now as unknown as any,
    },
    select: {
      id: true,
      community_id: true,
      author_user_id: true,
      post_type: true,
      title: true,
      body: true,
      link_url: true,
      image_url: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // 5. Build response mapping Date -> ISO strings
  return {
    id: updated.id,
    community_id: updated.community_id,
    author_user_id:
      updated.author_user_id === null ? undefined : updated.author_user_id,
    post_type: updated.post_type,
    title: updated.title,
    body: updated.body === null ? undefined : updated.body,
    link_url: updated.link_url === null ? undefined : updated.link_url,
    image_url: updated.image_url === null ? undefined : updated.image_url,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
