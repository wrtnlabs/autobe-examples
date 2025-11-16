import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorCommunitiesCommunityNameMembershipsMembershipId(props: {
  administrator: AdministratorPayload;
  communityName: string;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Lookup community by name (must not be deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Lookup membership by membershipId, check belongs to community and is not already deleted
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: props.membershipId,
        community_platform_community_id: community.id,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Membership not found or already deleted", 404);
  }

  // 3. Soft delete: update deleted_at with current iso string
  await MyGlobal.prisma.community_platform_community_memberships.update({
    where: { id: props.membershipId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 4. (Optional) Add audit logging here if such a mechanism/table is available in system
}
