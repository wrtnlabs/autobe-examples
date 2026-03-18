import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanSnapshotTransformer } from "../transformers/CommunityPlatformCommunityBanSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminBansBanIdSnapshots(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanSnapshot.ICreate;
}): Promise<ICommunityPlatformCommunityBanSnapshot> {
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        community_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        deleted_at: true,
      },
    });
  if (ban.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: ban.community_id },
      select: { id: true, community_owner_id: true },
    });
  const isOwner = community.community_owner_id === props.admin.id;
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: community.id,
        moderator_user_id: props.admin.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!isOwner && moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const banStatus = props.body.ban_status;
  const reason = props.body.reason;
  const effectiveFrom = props.body.effective_from;
  const effectiveUntil = props.body.effective_until ?? null;
  if (banStatus.trim().length === 0) {
    throw new HttpException("ban_status must be non-empty", 400);
  }
  if (reason.trim().length === 0) {
    throw new HttpException("reason must be non-empty", 400);
  }
  if (effectiveFrom.trim().length === 0) {
    throw new HttpException("effective_from must be non-empty", 400);
  }
  if (effectiveUntil !== null && effectiveUntil < effectiveFrom) {
    throw new HttpException("effective_until must be >= effective_from", 400);
  }
  const created =
    await MyGlobal.prisma.community_platform_community_ban_snapshots.create({
      data: await await (async () => {
        // use collector semantics but inline to avoid missing imports
        return {
          id: v4(),
          ban_status: banStatus,
          reason,
          effective_from: new Date(effectiveFrom),
          effective_until:
            effectiveUntil === undefined ? undefined : effectiveUntil,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          communityBan: { connect: { id: ban.id } },
          community: { connect: { id: community.id } },
          bannedUser: { connect: { id: ban.banned_user_id } },
          appliedByModerator: { connect: { id: ban.applied_by_moderator_id } },
        };
      })(),
      ...CommunityPlatformCommunityBanSnapshotTransformer.select(),
    });
  return await CommunityPlatformCommunityBanSnapshotTransformer.transform(
    created,
  );
}
