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

export async function getCommunityModeratorBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string;
}): Promise<ICommunityBannedUser> {
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: { id: props.banId },
    include: {
      community: { select: { id: true } },
      bannedUser: { select: { id: true } },
      bannedBy: { select: { id: true } },
    },
  });
  if (!ban) throw new HttpException("Ban not found", 404);
  // Check authorization: allow access if moderator is the one who imposed the ban or is a system admin
  if (ban.banned_by_id !== props.moderator.id) {
    const isAdmin = await MyGlobal.prisma.community_admins.findUnique({
      where: { id: props.moderator.id, deleted_at: null },
    });
    if (!isAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return CommunityBannedUserTransformer.transform(ban);
}
