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

export async function getCommunityModeratorCommunitiesCommunityIdBannedUsersBannedUserId(props: {
  moderator: ModeratorPayload;
  communityId: string;
  bannedUserId: string;
}): Promise<ICommunityBannedUser> {
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: {
      community_id_banned_user_id: {
        community_id: props.communityId,
        banned_user_id: props.bannedUserId,
      },
    },
    ...CommunityBannedUserTransformer.select(),
  });
  if (!ban) {
    throw new HttpException("Ban record not found or no longer active", 404);
  }
  // Transform flat Prisma result into nested object structure expected by transformer
  const transformedBan = {
    id: ban.id,
    created_at: ban.created_at,
    updated_at: ban.updated_at,
    deleted_at: ban.deleted_at,
    reason: ban.reason,
    community: { id: ban.community.id },
    bannedUser: { id: ban.bannedUser.id },
    bannedBy: { id: ban.bannedBy.id },
  };
  return await CommunityBannedUserTransformer.transform(transformedBan);
}
