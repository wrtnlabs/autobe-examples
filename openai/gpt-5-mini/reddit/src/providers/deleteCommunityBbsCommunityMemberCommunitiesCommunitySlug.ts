import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberCommunitiesCommunitySlug(props: {
  communityMember: CommunitymemberPayload;
  communitySlug: string;
}): Promise<void> {
  const { communityMember, communitySlug } = props;

  // Resolve community by unique slug
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
  });
  if (!community)
    throw new HttpException("Not Found: Community not found", 404);

  if (community.deleted_at !== null) {
    throw new HttpException("Conflict: Community already deleted", 409);
  }

  // Authorization: owner OR an active, non-revoked moderator
  const isOwner = community.creator_id === communityMember.id;

  const moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
      where: {
        community_id: community.id,
        community_member_id: communityMember.id,
        active: true,
        revoked_at: null,
      },
    });

  if (!isOwner && !moderator) {
    throw new HttpException(
      "Unauthorized: Only owner or moderator can delete the community",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  // Perform soft-delete and related updates atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft-delete the community
    await tx.community_bbs_communities.update({
      where: { id: community.id },
      data: { deleted_at: now },
    });

    // Soft-delete community settings (1:1)
    await tx.community_bbs_community_settings.updateMany({
      where: { community_id: community.id },
      data: { deleted_at: now },
    });

    // Soft-delete community-centric subscriptions (mark deleted_at only if not set)
    await tx.community_bbs_community_subscriptions.updateMany({
      where: { community_id: community.id, deleted_at: null },
      data: { deleted_at: now },
    });

    // Soft-delete user-centric subscriptions for this community (mark deleted_at only if not set)
    await tx.community_bbs_user_subscriptions.updateMany({
      where: { community_id: community.id, deleted_at: null },
      data: { deleted_at: now },
    });

    // Immutable audit record
    await tx.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "community_member",
        actor_id: communityMember.id,
        entity: "community",
        action: "deleted",
        payload: JSON.stringify({
          id: community.id,
          slug: community.slug,
          name: community.name,
          performed_by: communityMember.id,
        }),
        created_at: now,
        updated_at: now,
      },
    });

    // If performed by moderator (not owner), record a moderation action for auditability
    if (moderator && !isOwner) {
      await tx.community_bbs_moderation_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          moderator_id: moderator.id,
          target_community_id: community.id,
          action_type: "remove",
          reason_code: "community_deleted",
          note: `Community ${community.slug} soft-deleted by moderator ${communityMember.id}`,
          created_at: now,
          updated_at: now,
        },
      });
    }
  });

  // Trigger background work: cache invalidation, feed reindexing, metrics adjustment, notifications
  // Implementation note: enqueue a job or publish an event to the platform's job/queue system.
  // Example (platform-specific): await MyGlobal.jobQueue.enqueue("community.softDelete", { communityId: community.id, deletedAt: now });

  return;
}
