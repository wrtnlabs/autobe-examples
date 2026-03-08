import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberUsersUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeMember.IDeleteRequest;
}): Promise<void> {
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  // Verify the target user exists and is not already deleted
  const targetUser = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (targetUser === null) {
    throw new HttpException("User not found or already deleted", 404);
  }
  // Check authorization
  const isSelfDeletion = targetUser.id === props.member.id;
  if (isSelfDeletion) {
    // Verify password for self-deletion
    const isValidPassword = await PasswordUtil.verify(
      props.body.password,
      targetUser.password_hash,
    );
    if (!isValidPassword) {
      throw new HttpException("Invalid password", 403);
    }
  }
  // For non-self-deletion, admin/moderator authorization is handled by route decorator
  // Cascade delete related data
  // 1. Delete posts (soft delete)
  await MyGlobal.prisma.reddit_like_posts.updateMany({
    where: {
      author_id: props.userId,
      deleted_at: null,
    },
    data: {
      deleted_at: nowIso,
      updated_at: nowIso,
    },
  });
  // 2. Delete comments (soft delete)
  await MyGlobal.prisma.reddit_like_comments.updateMany({
    where: {
      author_id: props.userId,
      deleted_at: null,
    },
    data: {
      deleted_at: nowIso,
      updated_at: nowIso,
    },
  });
  // 3. Delete subscriptions (soft delete)
  await MyGlobal.prisma.reddit_like_subscriptions.updateMany({
    where: {
      member: {
        id: props.userId,
      },
      deleted_at: null,
    },
    data: {
      deleted_at: nowIso,
      updated_at: nowIso,
    },
  });
  // 4. Invalidate all active sessions (soft delete)
  await MyGlobal.prisma.reddit_like_member_sessions.updateMany({
    where: {
      member: {
        id: props.userId,
      },
      revoked_at: null,
    },
    data: {
      revoked_at: nowIso,
      updated_at: nowIso,
    },
  });
  // 5. Soft delete the user record
  await MyGlobal.prisma.reddit_like_members.update({
    where: {
      id: props.userId,
    },
    data: {
      deleted_at: nowIso,
      updated_at: nowIso,
    },
  });
}
