import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPortalSubscription.ICreate;
}): Promise<ICommunityPortalSubscription> {
  const { member, communityId } = props;

  // Verify target community exists
  const community =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { id: communityId },
    });
  if (!community) throw new HttpException("Not Found", 404);

  // Enforce access for private communities: only creator or active moderator may subscribe
  if (community.is_private) {
    const isCreator =
      community.creator_user_id !== null &&
      community.creator_user_id === member.id;

    const moderator =
      await MyGlobal.prisma.community_portal_moderators.findFirst({
        where: {
          user_id: member.id,
          community_id: communityId,
          is_active: true,
        },
      });

    if (!isCreator && !moderator) {
      throw new HttpException(
        "Forbidden: cannot subscribe to a private community",
        403,
      );
    }
  }

  // Single timestamp used for creation/update operations
  const now = toISOStringSafe(new Date());

  // Check for existing subscription (active or soft-deleted)
  const existing =
    await MyGlobal.prisma.community_portal_subscriptions.findFirst({
      where: { user_id: member.id, community_id: communityId },
    });

  if (existing) {
    // If already active, conflict
    if (existing.deleted_at === null) {
      throw new HttpException("Conflict: subscription already exists", 409);
    }

    // Reactivate soft-deleted subscription: clear deleted_at and bump updated_at
    const updated = await MyGlobal.prisma.community_portal_subscriptions.update(
      {
        where: { id: existing.id },
        data: { deleted_at: null, updated_at: now },
      },
    );

    return {
      id: updated.id as string & tags.Format<"uuid">,
      user_id: updated.user_id as string & tags.Format<"uuid">,
      community_id: updated.community_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: null,
    };
  }

  // Create a new subscription record
  const created = await MyGlobal.prisma.community_portal_subscriptions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: member.id,
      community_id: communityId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    community_id: created.community_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
