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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommunitiesCommunityIdMembershipsMembershipId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IUpdate;
}): Promise<ICommunityPlatformCommunityMembership> {
  // 1. Lookup the membership and verify community linkage and ownership
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findUnique({
      where: { id: props.membershipId },
    });
  if (
    !membership ||
    membership.community_platform_community_id !== props.communityId
  ) {
    throw new HttpException(
      "Membership not found in the specified community.",
      404,
    );
  }
  if (membership.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to update this membership.",
      403,
    );
  }

  // 2. Update joined_at if provided in the body
  const updated =
    await MyGlobal.prisma.community_platform_community_memberships.update({
      where: { id: props.membershipId },
      data: {
        joined_at: props.body.joined_at ?? undefined,
      },
    });

  // 3. Fetch referenced user and community for summary
  const [user, community] = await Promise.all([
    MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: updated.community_platform_user_id },
      select: { id: true, display_name: true },
    }),
    MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: updated.community_platform_community_id },
      select: { id: true, name: true, description: true },
    }),
  ]);

  return {
    id: updated.id,
    user: {
      id: user.id,
      display_name: user.display_name,
    },
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    joined_at: toISOStringSafe(updated.joined_at),
  };
}
