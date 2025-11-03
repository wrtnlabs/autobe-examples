import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserCommunitiesCommunityIdModeratorInvitationsInvitationId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorInvitation> {
  // Step 1: Fetch the invitation record matching the community and invitation ids
  const invitation =
    await MyGlobal.prisma.community_platform_community_moderator_invitations.findUnique(
      {
        where: {
          id: props.invitationId,
          community_platform_community_id: props.communityId,
        },
      },
    );
  if (!invitation) {
    throw new HttpException("Invitation not found", 404);
  }

  // Step 2: Confirm the requesting user is a moderator in the target community
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.user.id,
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }

  // Step 3: Map invitation fields to DTO; use explicit null for missing nullable fields
  return {
    id: invitation.id,
    community_platform_user_id: invitation.community_platform_user_id,
    community_platform_community_id: invitation.community_platform_community_id,
    invited_by_user_id: invitation.invited_by_user_id,
    invited_at: toISOStringSafe(invitation.invited_at),
    accepted_at:
      invitation.accepted_at !== null && invitation.accepted_at !== undefined
        ? toISOStringSafe(invitation.accepted_at)
        : null,
    revoked_at:
      invitation.revoked_at !== null && invitation.revoked_at !== undefined
        ? toISOStringSafe(invitation.revoked_at)
        : null,
  };
}
