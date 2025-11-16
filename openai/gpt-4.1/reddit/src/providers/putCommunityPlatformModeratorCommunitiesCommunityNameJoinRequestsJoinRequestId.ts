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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityNameJoinRequestsJoinRequestId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  joinRequestId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityJoinRequest.IUpdate;
}): Promise<ICommunityPlatformCommunityJoinRequest> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        moderator_id: props.moderator.id,
      },
    });
  if (!isModerator) {
    throw new HttpException("You are not a moderator for this community", 403);
  }
  const joinRequest =
    await MyGlobal.prisma.community_platform_community_join_requests.findFirst({
      where: {
        id: props.joinRequestId,
        community_platform_community_id: community.id,
        deleted_at: null,
      },
      include: {
        user: true,
      },
    });
  if (!joinRequest) {
    throw new HttpException("Join request not found", 404);
  }
  if (joinRequest.status !== "pending") {
    throw new HttpException("Only pending requests can be updated", 409);
  }
  if (!["approved", "rejected", "expired"].includes(props.body.status)) {
    throw new HttpException(
      "Invalid status transition: status must be 'approved', 'rejected', or 'expired'",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_join_requests.update({
      where: { id: props.joinRequestId },
      data: {
        status: props.body.status,
        processed_by_moderator_id: props.moderator.id,
        processed_at: now,
        updated_at: now,
      },
    });
  const communitySummary =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: updated.community_platform_community_id },
      select: {
        id: true,
        name: true,
        display_title: true,
        description: true,
        visibility: true,
        image_url: true,
        status: true,
      },
    });
  const userSummary = await MyGlobal.prisma.community_platform_users.findUnique(
    {
      where: { id: updated.user_id },
      select: {
        id: true,
      },
    },
  );
  return {
    id: updated.id,
    community: communitySummary!,
    user: userSummary!,
    processed_by_moderator: { id: props.moderator.id },
    request_message: updated.request_message ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : undefined,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
