import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserCommunitiesCommunityNameMembershipsMembershipId(props: {
  user: UserPayload;
  communityName: string;
  membershipId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityMembership> {
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findUnique({
      where: { id: props.membershipId },
      include: {
        community: true,
        user: true,
      },
    });

  if (!membership || !membership.community || !membership.user) {
    throw new HttpException("Membership not found", 404);
  }

  const requestedCommunityName = props.communityName.toLowerCase();
  const foundCommunityName = membership.community.name.toLowerCase();
  if (requestedCommunityName !== foundCommunityName) {
    throw new HttpException("Community mismatch", 404);
  }

  if (membership.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: membership.id,
    community: {
      id: membership.community.id,
      name: membership.community.name,
      display_title: membership.community.display_title,
      description: membership.community.description,
      visibility: membership.community.visibility,
      image_url:
        membership.community.image_url === null
          ? undefined
          : membership.community.image_url,
      status: membership.community.status,
    },
    user: {
      id: membership.user.id,
    },
    join_request_id:
      typeof membership.join_request_id === "undefined"
        ? undefined
        : membership.join_request_id === null
          ? null
          : membership.join_request_id,
    status: membership.status,
    created_at: toISOStringSafe(membership.created_at),
    updated_at: toISOStringSafe(membership.updated_at),
    deleted_at:
      typeof membership.deleted_at === "undefined"
        ? undefined
        : membership.deleted_at === null
          ? null
          : toISOStringSafe(membership.deleted_at),
  };
}
