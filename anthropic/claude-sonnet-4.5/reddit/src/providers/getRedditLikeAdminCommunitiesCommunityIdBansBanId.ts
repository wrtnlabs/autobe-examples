import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityBan> {
  const { admin, communityId, banId } = props;

  const ban = await MyGlobal.prisma.reddit_like_community_bans.findFirstOrThrow(
    {
      where: {
        id: banId,
        community_id: communityId,
        deleted_at: null,
      },
    },
  );

  return {
    id: ban.id,
    banned_member_id: ban.banned_member_id,
    community_id: ban.community_id,
    ban_reason_category: ban.ban_reason_category,
    ban_reason_text: ban.ban_reason_text,
    is_permanent: ban.is_permanent,
    expiration_date:
      ban.expiration_date === null
        ? undefined
        : toISOStringSafe(ban.expiration_date),
    is_active: ban.is_active,
    created_at: toISOStringSafe(ban.created_at),
  };
}
