import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postCommunityPlatformMemberUserCommunitiesCommunityIdSubscribe(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscription> {
  const { memberUser, communityId } = props;

  // 1) Verify target community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        visibility: true,
        deleted_at: true,
      },
    });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  // 2) Determine desired status based on community visibility
  const visibility = community.visibility;
  const desiredStatus =
    visibility === "public"
      ? "subscribed"
      : visibility === "restricted" || visibility === "private"
        ? "pending"
        : "subscribed";

  // 3) Check existing subscription (any state)
  const existing =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        community_platform_user_id: memberUser.id,
        community_platform_community_id: communityId,
      },
    });

  // If exists and not soft-deleted
  if (existing && existing.deleted_at === null) {
    // If banned/blocked, forbid
    if (existing.status === "banned" || existing.status === "blocked") {
      throw new HttpException(
        "Forbidden: subscription is banned or blocked",
        403,
      );
    }

    // Return current active mapping (idempotent)
    return {
      id: existing.id as string & tags.Format<"uuid">,
      community_platform_community_id:
        existing.community_platform_community_id as string &
          tags.Format<"uuid">,
      status: existing.status,
      muted: existing.muted,
      muted_at: existing.muted_at ? toISOStringSafe(existing.muted_at) : null,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  }

  // If exists but soft-deleted → reactivate
  if (existing && existing.deleted_at !== null) {
    const now = toISOStringSafe(new Date());
    const updated =
      await MyGlobal.prisma.community_platform_subscriptions.update({
        where: { id: existing.id },
        data: {
          deleted_at: null,
          status: desiredStatus, // Reactivate with appropriate status based on visibility
          updated_at: now,
        },
      });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      community_platform_community_id:
        updated.community_platform_community_id as string & tags.Format<"uuid">,
      status: updated.status,
      muted: updated.muted,
      muted_at: updated.muted_at ? toISOStringSafe(updated.muted_at) : null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: now,
    };
  }

  // 4) Create new subscription
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_subscriptions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_user_id: memberUser.id,
        community_platform_community_id: communityId,
        status: desiredStatus,
        muted: false,
        muted_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    community_platform_community_id:
      created.community_platform_community_id as string & tags.Format<"uuid">,
    status: created.status,
    muted: created.muted,
    muted_at: created.muted_at ? toISOStringSafe(created.muted_at) : null,
    created_at: now,
    updated_at: now,
  };
}
