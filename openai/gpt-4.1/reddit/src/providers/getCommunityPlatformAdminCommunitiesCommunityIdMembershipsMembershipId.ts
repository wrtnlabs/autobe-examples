import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommunitiesCommunityIdMembershipsMembershipId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityMembership> {
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: props.membershipId,
        community_platform_community_id: props.communityId,
      },
      include: {
        user: true,
        community: true,
      },
    });
  if (!membership) {
    throw new HttpException("Membership not found", 404);
  }
  return {
    id: membership.id,
    user: {
      id: membership.user.id,
      display_name: membership.user.display_name,
    },
    community: {
      id: membership.community.id,
      name: membership.community.name,
      description: membership.community.description,
    },
    joined_at: toISOStringSafe(membership.joined_at),
  };
}
