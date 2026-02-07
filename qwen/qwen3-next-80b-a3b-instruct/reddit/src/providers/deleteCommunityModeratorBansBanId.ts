import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityModeratorBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string;
}): Promise<ICommunityBannedUser> {
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: {
      id: props.banId,
      deleted_at: null,
    },
    select: {
      id: true,
      community: { select: { id: true } },
      bannedUser: { select: { id: true } },
      bannedBy: { select: { id: true } },
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!ban) {
    throw new HttpException("Ban not found or already lifted", 404);
  }
  // Authorized if requester is the original banning moderator OR platform admin
  if (
    ban.bannedBy.id !== props.moderator.id &&
    (props.moderator.type as string) !== "admin"
  ) {
    throw new HttpException("Unauthorized to unban this user", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_bans.update({
    where: { id: props.banId },
    data: {
      updated_at: now,
      deleted_at: now,
    },
    select: {
      id: true,
      community: { select: { id: true } },
      bannedUser: { select: { id: true } },
      bannedBy: { select: { id: true } },
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return CommunityBannedUserTransformer.transform(updated);
}
