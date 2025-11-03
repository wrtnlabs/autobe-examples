import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberCommunitiesCommunitySlugSubscriptions(props: {
  communityMember: CommunitymemberPayload;
  communitySlug: string;
}): Promise<void> {
  const { communityMember, communitySlug } = props;

  // Resolve community by slug
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
  });
  if (!community) throw new HttpException("Not Found", 404);

  // Locate active subscription for the authenticated member
  const subscription =
    await MyGlobal.prisma.community_bbs_community_subscriptions.findFirst({
      where: {
        community_id: community.id,
        community_member_id: communityMember.id,
        deleted_at: null,
        is_active: true,
      },
    });

  // Idempotent: if there's no active subscription, do nothing
  if (!subscription) return;

  const now = toISOStringSafe(new Date());

  // Transactionally perform soft-delete, cached count update, and audit log
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_bbs_community_subscriptions.update({
      where: { id: subscription.id },
      data: {
        deleted_at: now,
        is_active: false,
        updated_at: now,
      },
    });

    await tx.community_bbs_communities.update({
      where: { id: community.id },
      data: {
        members_count:
          community.members_count > 0 ? community.members_count - 1 : 0,
      },
    });

    await tx.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        target_community_id: community.id,
        target_user_id: communityMember.id,
        actor_type: "communityMember",
        actor_id: communityMember.id,
        entity: "subscription",
        action: "erase_subscription",
        payload: JSON.stringify({
          subscription_id: subscription.id,
          community_slug: community.slug,
        }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    });
  });
}
