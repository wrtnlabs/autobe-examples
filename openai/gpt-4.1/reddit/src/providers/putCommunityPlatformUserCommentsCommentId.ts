import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // Lookup comment by ID, ensure not soft-deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found or has been deleted.", 404);
  }
  if (comment.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to edit this comment.",
      403,
    );
  }
  // Update the allowed fields: body, updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: now,
    },
  });
  // Fetch FK context for summary object construction
  const [post, user, session] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: updated.post_id },
      select: { id: true, community_id: true, user_id: true },
    }),
    MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: updated.user_id },
      select: { id: true },
    }),
    MyGlobal.prisma.community_platform_user_sessions.findUnique({
      where: { id: updated.user_session_id },
      select: { id: true, created_at: true },
    }),
  ]);
  if (!post) {
    throw new HttpException("Post not found (FK lookup failed)", 404);
  }
  if (!user) {
    throw new HttpException("User not found (FK lookup failed)", 404);
  }
  if (!session) {
    throw new HttpException("User session not found (FK lookup failed)", 404);
  }
  const postSummary: ICommunityPlatformPost.ISummary = {
    id: post.id,
    community_id: post.community_id,
    community: undefined,
    user_id: post.user_id,
    user: undefined,
  };
  const userSummary: ICommunityPlatformUser.ISummary = { id: user.id };
  const sessionSummary: ICommunityPlatformUserSession.ISummary = {
    id: session.id,
    created_at: toISOStringSafe(session.created_at),
  };
  // Parent summary (optional)
  let parentSummary: ICommunityPlatformComment.ISummary | null | undefined =
    undefined;
  if (updated.parent_id) {
    const parent = await MyGlobal.prisma.community_platform_comments.findUnique(
      {
        where: { id: updated.parent_id },
        select: {
          id: true,
          user_id: true,
          post_id: true,
          created_at: true,
          parent_id: true,
        },
      },
    );
    if (parent) {
      const parentPost =
        await MyGlobal.prisma.community_platform_posts.findUnique({
          where: { id: parent.post_id },
          select: { id: true, community_id: true, user_id: true },
        });
      parentSummary = {
        id: parent.id,
        user: { id: parent.user_id },
        post: parentPost
          ? {
              id: parentPost.id,
              community_id: parentPost.community_id,
              community: undefined,
              user_id: parentPost.user_id,
              user: undefined,
            }
          : {
              id: parent.post_id,
              community_id: parent.post_id as string & tags.Format<"uuid">, // Fallback for corrupted FK
              community: undefined,
              user_id: parent.user_id,
              user: undefined,
            },
        parent_id: parent.parent_id ?? undefined,
        created_at: toISOStringSafe(parent.created_at),
      };
    } else {
      parentSummary = null;
    }
  }
  return {
    id: updated.id,
    post: postSummary,
    author: userSummary,
    userSession: sessionSummary,
    parent: parentSummary ?? undefined,
    body: updated.body,
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
