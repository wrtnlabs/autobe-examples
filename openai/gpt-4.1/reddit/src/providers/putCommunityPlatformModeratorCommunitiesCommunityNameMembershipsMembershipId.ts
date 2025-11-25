import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityNameMembershipsMembershipId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  membershipId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IUpdate;
}): Promise<ICommunityPlatformCommunityMembership> {
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

  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: props.membershipId,
        community_platform_community_id: community.id,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Membership not found", 404);
  }

  // Inline the update data as required
  const updated =
    await MyGlobal.prisma.community_platform_community_memberships.update({
      where: { id: membership.id },
      data: {
        ...(Object.prototype.hasOwnProperty.call(props.body, "status")
          ? { status: props.body.status }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(props.body, "deleted_at")
          ? { deleted_at: props.body.deleted_at }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: updated.user_id },
  });

  return {
    id: updated.id,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url:
        community.image_url !== null && typeof community.image_url === "string"
          ? community.image_url
          : undefined,
      status: community.status,
    },
    user: {
      id: user && typeof user.id === "string" ? user.id : "",
    },
    join_request_id:
      updated.join_request_id !== undefined
        ? updated.join_request_id === null
          ? null
          : updated.join_request_id
        : undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined
        ? updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
