import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorPassword";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function putMyPassword(props: {
  communityModerator: CommunitymoderatorPayload;
  body: ICommunityPlatformCommunityModeratorPassword.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator.ISecurity> {
  const { communityModerator, body } = props;

  // Authorization reinforcement: ensure the moderator assignment is still active
  const activeModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_user_id: communityModerator.id,
        revoked_at: null,
        deleted_at: null,
        user: { is: { deleted_at: null } },
      },
    });
  if (activeModerator === null) {
    throw new HttpException(
      "Forbidden: Not an active community moderator",
      403,
    );
  }

  // Load the caller's user record (must not be soft-deleted)
  const user = await MyGlobal.prisma.community_platform_users.findFirstOrThrow({
    where: { id: communityModerator.id, deleted_at: null },
  });

  // Verify current password
  const ok = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (ok !== true) {
    throw new HttpException("Current password is incorrect", 403);
  }

  // Hash new password
  const nextHash = await PasswordUtil.hash(body.new_password);

  // Update password_hash and updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: communityModerator.id },
    data: {
      password_hash: nextHash,
      updated_at: now,
    },
  });

  // Optionally rotate tokens per policy (omitted here). Return security result.
  return { status: "updated" };
}
