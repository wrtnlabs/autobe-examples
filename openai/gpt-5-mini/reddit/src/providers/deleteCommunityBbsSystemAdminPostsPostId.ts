import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function deleteCommunityBbsSystemAdminPostsPostId(props: {
  systemAdmin: SystemadminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, postId } = props;

  // Authorization: ensure the provided actor is a system administrator
  if (!systemAdmin || systemAdmin.type !== "systemadmin") {
    throw new HttpException("Unauthorized", 403);
  }

  // Fetch the target post; must exist
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
  });
  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  // NOTE: The Prisma schema does not expose a 'legal_hold' field or equivalent
  // on community_bbs_posts or related tables. Therefore we cannot enforce legal
  // hold here. If legal-hold enforcement is required, add the appropriate
  // field to the schema and re-run code generation.

  // Prepare timestamp once for consistency
  const now = toISOStringSafe(new Date());

  // Soft-delete the post: set deleted_at and mark as unpublished
  await MyGlobal.prisma.community_bbs_posts.update({
    where: { id: postId },
    data: {
      deleted_at: now,
      is_published: false,
    },
  });

  // The moderation_actions model requires a moderator_id (FK to community_bbs_community_moderators).
  // Business actor is a system admin (not a community moderator). To satisfy the
  // schema FK we attempt to attribute the action to an active community
  // moderator for the post's community. If none exists, we fall back to the
  // first available moderator record in the database to satisfy referential
  // integrity.
  let moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
      where: { community_id: post.community_bbs_community_id, active: true },
      orderBy: { assigned_at: "asc" },
    });

  if (!moderator) {
    moderator =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        orderBy: { created_at: "asc" },
      });
  }

  if (!moderator) {
    // Cannot create moderation_action without a moderator_id to satisfy FK
    // constraints. This indicates a schema/contract limitation: moderation
    // actions require community moderator attribution even for system-admin
    // removals. Surface an error so the caller can reconcile the state.
    throw new HttpException(
      "Conflict: no moderator available to attribute action",
      409,
    );
  }

  // Create moderation action record attributing the removal
  await MyGlobal.prisma.community_bbs_moderation_actions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: moderator.id,
      target_post_id: postId,
      target_comment_id: null,
      target_community_id: post.community_bbs_community_id,
      origin_report_id: null,
      action_type: "remove",
      reason_code: "admin_remove",
      note: `Removed by system admin: ${systemAdmin.id}`,
      expires_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Create an audit log entry recording that a system admin performed this action
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      target_post_id: postId,
      target_comment_id: null,
      target_community_id: post.community_bbs_community_id,
      target_user_id: null,
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "post",
      action: "remove",
      payload: JSON.stringify({
        reason: "admin_remove",
        moderator_id: moderator.id,
      }),
      ip: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Successful soft-delete returns void (204 handled by controller layer)
  return;
}
