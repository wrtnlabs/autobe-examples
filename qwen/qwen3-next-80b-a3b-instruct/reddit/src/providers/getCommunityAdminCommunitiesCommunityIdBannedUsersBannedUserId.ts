import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminCommunitiesCommunityIdBannedUsersBannedUserId(props: {
  admin: AdminPayload;
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
    throw new HttpException("Ban not found or inactive", 404);
  }
  // Transform the flat Prisma result into the nested structure expected by transformer
  const transformedBan = {
    ...ban,
    community: { id: ban.community?.id },
    bannedUser: { id: ban.bannedUser?.id },
    bannedBy: { id: ban.bannedBy?.id },
  };
  return await CommunityBannedUserTransformer.transform(transformedBan);
}
