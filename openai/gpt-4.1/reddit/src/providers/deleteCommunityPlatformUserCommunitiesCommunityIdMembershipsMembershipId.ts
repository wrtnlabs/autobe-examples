import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommunitiesCommunityIdMembershipsMembershipId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, communityId, membershipId } = props;

  // Step 1: Fetch the membership by id & communityId
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: membershipId,
        community_platform_community_id: communityId,
      },
    });
  if (!membership) {
    throw new HttpException("Membership not found", 404);
  }

  // Step 2: Ensure it's the user's own membership (not another user's)
  if (membership.community_platform_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: You may only remove your own membership",
      403,
    );
  }

  // Step 3: Delete the membership
  await MyGlobal.prisma.community_platform_community_memberships.delete({
    where: { id: membership.id },
  });
}
