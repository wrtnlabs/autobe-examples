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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorCommunitiesCommunityNameMembershipsMembershipId(props: {
  administrator: AdministratorPayload;
  communityName: string;
  membershipId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IUpdate;
}): Promise<ICommunityPlatformCommunityMembership> {
  // 1. Find the community by unique name and not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Find the membership by id + community id; switch to findFirst in case composite is not uniquely indexed
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: props.membershipId,
        community_platform_community_id: community.id,
      },
    });
  if (!membership) {
    throw new HttpException("Membership not found", 404);
  }

  // 3. Prepare allowed update fields & guarantee updated_at mutation
  const updateFields: Record<string, unknown> = {
    ...(typeof props.body.status === "string"
      ? { status: props.body.status }
      : {}),
    ...(props.body.deleted_at !== undefined
      ? { deleted_at: props.body.deleted_at }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // 4. Perform immutable membership update
  const updated =
    await MyGlobal.prisma.community_platform_community_memberships.update({
      where: { id: props.membershipId },
      data: updateFields,
    });

  // 5. Join community summary
  const platformUser =
    await MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: updated.user_id },
    });
  if (!platformUser) throw new HttpException("User not found", 404);

  return {
    id: updated.id,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      status: community.status,
      ...(community.image_url !== null
        ? { image_url: community.image_url }
        : {}),
    },
    user: {
      id: platformUser.id,
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
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
