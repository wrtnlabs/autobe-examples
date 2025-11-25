import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityNameMembershipsMembershipId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found.", 404);
  }

  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: props.membershipId,
        community_platform_community_id: community.id,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Membership not found.", 404);
  }

  await MyGlobal.prisma.community_platform_community_memberships.update({
    where: { id: props.membershipId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      // No other field updates necessary
    },
  });
  // NOTE: Audit log for deletion is handled outside this provider.
}
