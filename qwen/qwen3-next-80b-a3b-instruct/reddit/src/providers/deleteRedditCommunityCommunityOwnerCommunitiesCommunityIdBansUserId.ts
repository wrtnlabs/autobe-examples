import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityOwnerCommunitiesCommunityIdBansUserId(props: {
  communityOwner: CommunityownerPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the active ban record
  const ban = await MyGlobal.prisma.reddit_community_bans.findUnique({
    where: {
      user_id_community_id: {
        user_id: props.userId,
        community_id: props.communityId,
      },
    },
    select: { is_active: true },
  });
  // If no active ban exists, return 404
  if (!ban || !ban.is_active) {
    throw new HttpException("Ban not found", 404);
  }
  // Update the ban record to soft-delete it (is_active = false)
  const now = new Date().toISOString();
  await MyGlobal.prisma.reddit_community_bans.update({
    where: {
      user_id_community_id: {
        user_id: props.userId,
        community_id: props.communityId,
      },
    },
    data: {
      is_active: false,
      updated_at: now,
    },
  });
}
