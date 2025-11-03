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

export async function putCommunityPlatformUserCommunitiesCommunityIdModeratorInvitationsInvitationId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorInvitation.IUpdate;
}): Promise<ICommunityPlatformCommunityModeratorInvitation> {
  const { user, communityId, invitationId, body } = props;

  // Fetch invitation, verify community linkage
  const invitation =
    await MyGlobal.prisma.community_platform_community_moderator_invitations.findUnique(
      {
        where: { id: invitationId },
      },
    );
  if (!invitation) {
    throw new HttpException("Invitation not found", 404);
  }
  if (invitation.community_platform_community_id !== communityId) {
    throw new HttpException(
      "Invitation does not belong to this community",
      400,
    );
  }

  // Ensure only one update field is provided
  const hasAccepted = "accepted_at" in body && body.accepted_at !== undefined;
  const hasRevoked = "revoked_at" in body && body.revoked_at !== undefined;
  if (hasAccepted && hasRevoked) {
    throw new HttpException("Cannot set both accepted_at and revoked_at", 400);
  }
  if (!hasAccepted && !hasRevoked) {
    throw new HttpException(
      "You must provide either accepted_at or revoked_at for update",
      400,
    );
  }

  const isInvitee = invitation.community_platform_user_id === user.id;

  if (hasAccepted) {
    // Only the invitee can accept
    if (!isInvitee) {
      throw new HttpException(
        "Only the invited user can accept this invitation",
        403,
      );
    }
    if (invitation.accepted_at !== null) {
      throw new HttpException("Invitation already accepted", 409);
    }
    if (invitation.revoked_at !== null) {
      throw new HttpException("Invitation already revoked", 409);
    }
  } else if (hasRevoked) {
    // Only another moderator (not the invitee) can revoke
    if (isInvitee) {
      throw new HttpException(
        "Invited user cannot revoke their own invitation",
        403,
      );
    }
    if (invitation.accepted_at !== null) {
      throw new HttpException("Invitation already accepted", 409);
    }
    if (invitation.revoked_at !== null) {
      throw new HttpException("Invitation already revoked", 409);
    }
    // Must be current moderator on this community
    const isModerator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: communityId,
          community_platform_user_id: user.id,
        },
      });
    if (!isModerator) {
      throw new HttpException(
        "Only a current moderator can revoke an invitation",
        403,
      );
    }
  }

  const data = hasAccepted
    ? {
        accepted_at:
          body.accepted_at !== undefined
            ? toISOStringSafe(body.accepted_at)
            : undefined,
      }
    : {
        revoked_at:
          body.revoked_at !== undefined
            ? toISOStringSafe(body.revoked_at)
            : undefined,
      };

  const updated =
    await MyGlobal.prisma.community_platform_community_moderator_invitations.update(
      {
        where: { id: invitationId },
        data,
      },
    );

  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    community_platform_community_id: updated.community_platform_community_id,
    invited_by_user_id: updated.invited_by_user_id,
    invited_at: toISOStringSafe(updated.invited_at),
    accepted_at:
      updated.accepted_at !== null && updated.accepted_at !== undefined
        ? toISOStringSafe(updated.accepted_at)
        : undefined,
    revoked_at:
      updated.revoked_at !== null && updated.revoked_at !== undefined
        ? toISOStringSafe(updated.revoked_at)
        : undefined,
  };
}
