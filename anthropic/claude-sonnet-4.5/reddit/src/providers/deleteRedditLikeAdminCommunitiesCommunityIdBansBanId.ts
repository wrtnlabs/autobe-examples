import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditLikeAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityId, banId } = props;

  // Fetch the ban to verify it exists and belongs to the specified community
  const ban =
    await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
      where: { id: banId },
    });

  // Verify the ban belongs to the specified community (data integrity check)
  if (ban.community_id !== communityId) {
    throw new HttpException(
      "Ban does not belong to the specified community",
      404,
    );
  }

  // Check if ban is already deleted (idempotency)
  if (ban.deleted_at !== null) {
    return;
  }

  // Administrators have platform-wide privileges to lift any community ban
  // Admin role is already verified by the AdminAuth decorator

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_community_bans.update({
    where: { id: banId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      is_active: false,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
