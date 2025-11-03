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

export async function postCommunityPlatformUserCommunitiesCommunityIdModeratorInvitations(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorInvitation.ICreate;
}): Promise<ICommunityPlatformCommunityModeratorInvitation> {
  // Check if the community exists (not deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found.", 404);
  }

  // Check if the requesting user is a moderator in the community
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.user.id,
      },
    });
  if (!isModerator) {
    throw new HttpException("Only moderators can invite new moderators.", 403);
  }

  // Confirm the invitee (the user to be invited) exists and is not deleted
  const inviteeUser = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: props.body.community_platform_user_id,
      deleted_at: null,
    },
  });
  if (!inviteeUser) {
    throw new HttpException("Invited user not found.", 404);
  }

  // Confirm that invitee is actually a member of the community
  const isMember =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.body.community_platform_user_id,
      },
    });
  if (!isMember) {
    throw new HttpException(
      "Invited user must be a community member before being invited as moderator.",
      400,
    );
  }

  // Check that invitee is not currently banned (ban not revoked and not yet expired)
  const activeBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.body.community_platform_user_id,
        revoked_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gt: toISOStringSafe(new Date()) } },
        ],
      },
    });
  if (activeBan) {
    throw new HttpException("Invited user is banned from this community.", 400);
  }

  // Ensure invitee is not already a moderator
  const alreadyModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.body.community_platform_user_id,
      },
    });
  if (alreadyModerator) {
    throw new HttpException(
      "User is already a moderator in this community.",
      400,
    );
  }

  // Ensure there isn't already a pending moderator invitation
  const existingInvitation =
    await MyGlobal.prisma.community_platform_community_moderator_invitations.findFirst(
      {
        where: {
          community_platform_community_id: props.communityId,
          community_platform_user_id: props.body.community_platform_user_id,
          accepted_at: null,
          revoked_at: null,
        },
      },
    );
  if (existingInvitation) {
    throw new HttpException(
      "User already has a pending moderator invitation in this community.",
      409,
    );
  }

  // Generate the creation audit timestamp
  const now = toISOStringSafe(new Date());
  // Create new invitation record
  const invitation =
    await MyGlobal.prisma.community_platform_community_moderator_invitations.create(
      {
        data: {
          id: v4(),
          community_platform_user_id: props.body.community_platform_user_id,
          community_platform_community_id: props.communityId,
          invited_by_user_id: props.user.id,
          invited_at: now,
          accepted_at: null,
          revoked_at: null,
        },
      },
    );

  // Return in DTO format, handling null/undefined for optional fields
  return {
    id: invitation.id,
    community_platform_user_id: invitation.community_platform_user_id,
    community_platform_community_id: invitation.community_platform_community_id,
    invited_by_user_id: invitation.invited_by_user_id,
    invited_at: toISOStringSafe(invitation.invited_at),
    accepted_at: invitation.accepted_at
      ? toISOStringSafe(invitation.accepted_at)
      : undefined,
    revoked_at: invitation.revoked_at
      ? toISOStringSafe(invitation.revoked_at)
      : undefined,
  };
}
