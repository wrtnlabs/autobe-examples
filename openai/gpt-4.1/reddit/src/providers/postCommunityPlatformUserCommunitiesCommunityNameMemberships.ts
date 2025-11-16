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

export async function postCommunityPlatformUserCommunitiesCommunityNameMemberships(props: {
  user: UserPayload;
  communityName: string;
  body: ICommunityPlatformCommunityMembership.ICreate;
}): Promise<ICommunityPlatformCommunityMembership> {
  // 1. Look up the community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (
    !community ||
    community.status === "banned" ||
    community.status === "archived"
  ) {
    throw new HttpException("Community not found or unavailable", 404);
  }

  // 2. Check for existing active/non-removed membership (not soft-deleted)
  const existingMembership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        community_platform_community_id: community.id,
        user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (existingMembership) {
    throw new HttpException(
      "User already has an active or pending membership in this community",
      409,
    );
  }

  // 3. Determine initial status & join request validation
  let status = "active";
  let joinRequestId = props.body.join_request_id;
  if (community.visibility !== "public") {
    if (!joinRequestId) {
      throw new HttpException(
        "Join request is required for private or invite-only communities",
        403,
      );
    }
    const joinRequest =
      await MyGlobal.prisma.community_platform_community_join_requests.findFirst(
        {
          where: {
            id: joinRequestId,
            user_id: props.user.id,
            community_platform_community_id: community.id,
            deleted_at: null,
          },
        },
      );
    if (!joinRequest) {
      throw new HttpException("Invalid or missing join request", 403);
    }
    if (joinRequest.status !== "approved") {
      status = "pending";
    }
  }

  // 4. Create membership
  const now = toISOStringSafe(new Date());
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_community_id: community.id,
        user_id: props.user.id,
        join_request_id: joinRequestId,
        status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 5. Build response DTO
  return {
    id: membership.id,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url:
        typeof community.image_url === "string"
          ? community.image_url
          : undefined,
      status: community.status,
    },
    user: {
      id: props.user.id,
    },
    join_request_id: membership.join_request_id ?? undefined,
    status: membership.status,
    created_at: toISOStringSafe(membership.created_at),
    updated_at: toISOStringSafe(membership.updated_at),
    deleted_at:
      membership.deleted_at == null
        ? undefined
        : toISOStringSafe(membership.deleted_at),
  };
}
