import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommunitiesCommunityIdModeratorInvitationsInvitationId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorInvitation> {
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
    throw new HttpException("Moderator invitation not found", 404);
  }
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
