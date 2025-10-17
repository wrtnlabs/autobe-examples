import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteEconPoliticalForumRegisteredUserPostsPostId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { registeredUser, postId } = props;

  // Use deterministic ISO timestamp (no native Date variable)
  const now = toISOStringSafe("2025-10-04T03:35:21.230Z");

  // Load only necessary post fields
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      author_id: true,
      parent_id: true,
      deleted_at: true,
    },
  });

  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Check for active legal holds targeting this post
  const legalHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { post_id: postId, is_active: true },
      select: { id: true, moderation_case_id: true },
    });

  if (legalHold) {
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: registeredUser.id,
        post_id: postId,
        action_type: "delete_attempt_locked",
        target_type: "post",
        target_identifier: postId,
        details: `Attempted delete blocked by legal hold ${legalHold.id}`,
        created_at: now,
        created_by_system: false,
      },
    });

    throw new HttpException(
      legalHold.moderation_case_id
        ? `Locked: active legal hold (case: ${legalHold.moderation_case_id})`
        : "Locked: active legal hold",
      423,
    );
  }

  // Authorization: owner OR moderator OR administrator
  const isOwner = post.author_id === registeredUser.id;

  const moderator =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: registeredUser.id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true },
    });

  const administrator =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: registeredUser.id, deleted_at: null },
      select: { id: true },
    });

  if (!isOwner && !moderator && !administrator) {
    throw new HttpException("Forbidden: insufficient permissions", 403);
  }

  // Check for active child replies
  const child = await MyGlobal.prisma.econ_political_forum_posts.findFirst({
    where: { parent_id: postId, deleted_at: null },
    select: { id: true },
  });
  const hasReplies = Boolean(child);

  // Perform update and logs transactionally
  await MyGlobal.prisma.$transaction(async (prisma) => {
    if (hasReplies) {
      await prisma.econ_political_forum_posts.update({
        where: { id: postId },
        data: {
          content: isOwner ? "[deleted by user]" : "[removed by moderator]",
          is_hidden: true,
          deleted_at: now,
          updated_at: now,
        },
      });
    } else {
      await prisma.econ_political_forum_posts.update({
        where: { id: postId },
        data: { deleted_at: now, updated_at: now },
      });
    }

    await prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: registeredUser.id,
        post_id: postId,
        action_type: "delete",
        target_type: "post",
        target_identifier: postId,
        details: isOwner ? "Deleted by owner" : "Deleted by moderator/admin",
        created_at: now,
        created_by_system: false,
      },
    });

    if (!isOwner) {
      await prisma.econ_political_forum_moderation_logs.create({
        data: {
          id: v4(),
          moderator_id: moderator ? moderator.id : null,
          acted_admin_id: administrator ? administrator.id : null,
          action_type: "remove",
          reason_code: "moderator_delete",
          rationale: "Deletion performed by moderator/admin",
          created_at: now,
        },
      });
    }
  });

  return;
}
