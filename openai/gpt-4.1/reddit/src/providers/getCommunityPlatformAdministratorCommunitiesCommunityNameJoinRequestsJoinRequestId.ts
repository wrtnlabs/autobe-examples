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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorCommunitiesCommunityNameJoinRequestsJoinRequestId(props: {
  administrator: AdministratorPayload;
  communityName: string;
  joinRequestId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityJoinRequest> {
  const joinRequest =
    await MyGlobal.prisma.community_platform_community_join_requests.findUnique(
      {
        where: { id: props.joinRequestId },
        include: {
          community: true,
          user: true,
          moderator: true,
        },
      },
    );

  if (
    !joinRequest ||
    !joinRequest.community ||
    joinRequest.community.name !== props.communityName
  ) {
    throw new HttpException(
      "Join request not found for specified community.",
      404,
    );
  }

  return {
    id: joinRequest.id,
    community: {
      id: joinRequest.community.id,
      name: joinRequest.community.name,
      display_title: joinRequest.community.display_title,
      description: joinRequest.community.description,
      visibility: joinRequest.community.visibility,
      image_url:
        typeof joinRequest.community.image_url === "string"
          ? joinRequest.community.image_url
          : undefined,
      status: joinRequest.community.status,
    },
    user: {
      id: joinRequest.user.id,
    },
    processed_by_moderator: joinRequest.moderator
      ? { id: joinRequest.moderator.id }
      : undefined,
    request_message: joinRequest.request_message ?? undefined,
    status: joinRequest.status,
    created_at: toISOStringSafe(joinRequest.created_at),
    updated_at: toISOStringSafe(joinRequest.updated_at),
    processed_at: joinRequest.processed_at
      ? toISOStringSafe(joinRequest.processed_at)
      : undefined,
    deleted_at: joinRequest.deleted_at
      ? toISOStringSafe(joinRequest.deleted_at)
      : undefined,
  };
}
