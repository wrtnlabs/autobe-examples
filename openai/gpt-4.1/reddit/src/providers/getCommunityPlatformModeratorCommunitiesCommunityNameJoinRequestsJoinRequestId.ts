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

export async function getCommunityPlatformModeratorCommunitiesCommunityNameJoinRequestsJoinRequestId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  joinRequestId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityJoinRequest> {
  // Step 1: Lookup the community by unique name
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

  // Step 2: Lookup the join request by id and community
  const join =
    await MyGlobal.prisma.community_platform_community_join_requests.findFirst({
      where: {
        id: props.joinRequestId,
        community_platform_community_id: community.id,
        deleted_at: null,
      },
    });
  if (!join) {
    throw new HttpException("Join request not found", 404);
  }

  // Step 3: Related user
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: join.user_id, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Step 4: Optional moderator relationship (if processed)
  let processed_by_moderatorSummary:
    | ICommunityPlatformModerator.ISummary
    | null
    | undefined = undefined;
  if (
    join.processed_by_moderator_id !== null &&
    join.processed_by_moderator_id !== undefined
  ) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: { id: join.processed_by_moderator_id, deleted_at: null },
      });
    if (moderator) {
      processed_by_moderatorSummary = { id: moderator.id };
    } else {
      processed_by_moderatorSummary = null;
    }
  }

  // Step 5: Response DTO composition
  return {
    id: join.id,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url: community.image_url === null ? undefined : community.image_url,
      status: community.status,
    },
    user: {
      id: user.id,
    },
    processed_by_moderator: processed_by_moderatorSummary,
    request_message:
      join.request_message === null ? undefined : join.request_message,
    status: join.status,
    created_at: toISOStringSafe(join.created_at),
    updated_at: toISOStringSafe(join.updated_at),
    processed_at:
      join.processed_at === null ? null : toISOStringSafe(join.processed_at),
    deleted_at:
      join.deleted_at === null ? null : toISOStringSafe(join.deleted_at),
  };
}
