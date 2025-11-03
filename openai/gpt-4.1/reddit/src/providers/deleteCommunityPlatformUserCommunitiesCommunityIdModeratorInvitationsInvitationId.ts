import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommunitiesCommunityIdModeratorInvitationsInvitationId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Ensure actor has active moderation rights for specified community
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_user_id: props.user.id,
        community_platform_community_id: props.communityId,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Only community moderators may remove moderator invitations.",
      403,
    );
  }

  // Step 2: Retrieve the moderator invitation and enforce business rules
  const invitation =
    await MyGlobal.prisma.community_platform_community_moderator_invitations.findFirst(
      {
        where: {
          id: props.invitationId,
          community_platform_community_id: props.communityId,
        },
      },
    );
  if (!invitation) {
    throw new HttpException("Moderator invitation not found.", 404);
  }
  if (invitation.accepted_at !== null || invitation.revoked_at !== null) {
    throw new HttpException(
      "Cannot delete invitation: already accepted or revoked.",
      409,
    );
  }

  // Step 3: Delete the invitation
  await MyGlobal.prisma.community_platform_community_moderator_invitations.delete(
    {
      where: { id: props.invitationId },
    },
  );
}
