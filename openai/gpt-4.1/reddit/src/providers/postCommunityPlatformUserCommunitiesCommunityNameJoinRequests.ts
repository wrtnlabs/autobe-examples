import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommunitiesCommunityNameJoinRequests(props: {
  user: UserPayload;
  communityName: string;
  body: ICommunityPlatformCommunityJoinRequest.ICreate;
}): Promise<ICommunityPlatformCommunityJoinRequest> {
  // Find the target community by unique "name" (slug)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found.", 404);
  }

  if (community.visibility === "public") {
    throw new HttpException(
      "Cannot submit a join request to a public community.",
      400,
    );
  }

  // Check if a membership already exists for this user in this community
  const existingMembership =
    await MyGlobal.prisma.community_platform_community_memberships.findUnique({
      where: {
        community_platform_community_id_user_id: {
          community_platform_community_id: community.id,
          user_id: props.user.id,
        },
      },
    });
  if (existingMembership && !existingMembership.deleted_at) {
    throw new HttpException("You are already a member of this community.", 409);
  }

  // Check for an active or pending join request for this user in this community
  const existingJoinRequest =
    await MyGlobal.prisma.community_platform_community_join_requests.findFirst({
      where: {
        community_platform_community_id: community.id,
        user_id: props.user.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingJoinRequest) {
    throw new HttpException(
      "You already have a pending join request for this community.",
      409,
    );
  }

  // Create the join request
  const now = toISOStringSafe(new Date());
  const joinRequest =
    await MyGlobal.prisma.community_platform_community_join_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_community_id: community.id,
        user_id: props.user.id,
        request_message: props.body.request_message ?? null,
        status: "pending",
        created_at: now,
        updated_at: now,
      },
    });

  // Compose Community ISummary per ICommunityPlatformCommunity.ISummary
  const communitySummary = {
    id: community.id,
    name: community.name,
    display_title: community.display_title,
    description: community.description,
    visibility: community.visibility,
    image_url: community.image_url ?? undefined,
    status: community.status,
  };

  // Compose User ISummary
  const userSummary = {
    id: props.user.id,
  };

  const result: ICommunityPlatformCommunityJoinRequest = {
    id: joinRequest.id,
    community: communitySummary,
    user: userSummary,
    processed_by_moderator: undefined,
    request_message: joinRequest.request_message ?? undefined,
    status: joinRequest.status,
    created_at: toISOStringSafe(joinRequest.created_at),
    updated_at: toISOStringSafe(joinRequest.updated_at),
    processed_at: undefined,
    deleted_at: undefined,
  };
  return result;
}
