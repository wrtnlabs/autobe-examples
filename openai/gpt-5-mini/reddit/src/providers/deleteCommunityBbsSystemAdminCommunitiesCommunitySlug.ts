import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function deleteCommunityBbsSystemAdminCommunitiesCommunitySlug(props: {
  systemAdmin: SystemadminPayload;
  communitySlug: string;
}): Promise<void> {
  const { systemAdmin, communitySlug } = props;

  // Verify system admin exists and is active
  const admin = await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
    where: { id: systemAdmin.id },
  });
  if (!admin || admin.deleted_at) {
    throw new HttpException("Unauthorized: invalid system administrator", 403);
  }

  // Resolve community by slug
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
  });
  if (!community)
    throw new HttpException("Not Found: community not found", 404);
  if (community.deleted_at)
    throw new HttpException("Conflict: community already deleted", 409);

  const now = toISOStringSafe(new Date());

  // Try to find an existing moderator for the community to attribute moderation_action
  const moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
      where: { community_id: community.id },
    });

  try {
    await MyGlobal.prisma.$transaction([
      // soft-delete community
      MyGlobal.prisma.community_bbs_communities.update({
        where: { id: community.id },
        data: {
          deleted_at: now,
          updated_at: now,
          visibility: "private",
        },
      }),

      // soft-delete community settings (if present)
      MyGlobal.prisma.community_bbs_community_settings.updateMany({
        where: { community_id: community.id },
        data: { deleted_at: now, updated_at: now },
      }),

      // soft-unsubscribe community subscriptions
      MyGlobal.prisma.community_bbs_community_subscriptions.updateMany({
        where: { community_id: community.id, deleted_at: null },
        data: { deleted_at: now },
      }),

      // soft-unsubscribe user subscriptions for this community
      MyGlobal.prisma.community_bbs_user_subscriptions.updateMany({
        where: { community_id: community.id, deleted_at: null },
        data: { deleted_at: now },
      }),

      // create an audit log
      MyGlobal.prisma.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          target_community_id: community.id,
          actor_type: "system_admin",
          actor_id: systemAdmin.id,
          entity: "community",
          action: "deleted",
          payload: `Soft-deleted community ${community.slug} by system admin ${systemAdmin.id}`,
          created_at: now,
          updated_at: now,
        },
      }),

      // Conditional creation of moderation action when a moderator exists
      ...(moderator
        ? [
            MyGlobal.prisma.community_bbs_moderation_actions.create({
              data: {
                id: v4() as string & tags.Format<"uuid">,
                moderator_id: moderator.id,
                target_community_id: community.id,
                action_type: "remove",
                reason_code: "admin_deleted",
                note: `Soft-deleted by system admin ${systemAdmin.id}`,
                expires_at: null,
                created_at: now,
                updated_at: now,
              },
            }),
          ]
        : []),
    ]);

    // Best-effort cache/invalidation hooks (non-fatal)
    try {
      // Optional chaining: if caching layer exists, invalidate community lists
      // This is best-effort and must not break the main flow
      (MyGlobal as any).cache?.invalidate?.("communities");
    } catch (e) {
      // swallow cache errors
    }

    return;
  } catch (e) {
    // Unexpected errors
    throw new HttpException(
      "Internal Server Error: failed to delete community",
      500,
    );
  }
}
