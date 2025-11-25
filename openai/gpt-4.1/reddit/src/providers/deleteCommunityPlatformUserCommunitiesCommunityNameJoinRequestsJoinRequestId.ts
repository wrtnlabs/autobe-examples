import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommunitiesCommunityNameJoinRequestsJoinRequestId(props: {
  user: UserPayload;
  communityName: string;
  joinRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Resolve community by name (must not be deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Step 2: Lookup join request
  const joinRequest =
    await MyGlobal.prisma.community_platform_community_join_requests.findUnique(
      {
        where: {
          id: props.joinRequestId,
          community_platform_community_id: community.id,
          deleted_at: null,
        },
      },
    );
  if (!joinRequest) {
    throw new HttpException("Join request not found or already deleted", 404);
  }

  // Step 3: Check authorization (owner or community moderator)
  let isAuthorized = false;
  if (joinRequest.user_id === props.user.id) {
    isAuthorized = true;
  } else {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: community.id,
          moderator_id: props.user.id,
        },
      });
    if (moderator) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new HttpException(
      "You are not authorized to delete this join request",
      403,
    );
  }

  // Step 4: Soft delete the join request
  await MyGlobal.prisma.community_platform_community_join_requests.update({
    where: { id: props.joinRequestId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
