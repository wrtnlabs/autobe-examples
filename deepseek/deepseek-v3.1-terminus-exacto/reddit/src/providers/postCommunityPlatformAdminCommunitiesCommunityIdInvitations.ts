import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityInvitationCollector } from "../collectors/CommunityPlatformCommunityInvitationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityInvitationTransformer } from "../transformers/CommunityPlatformCommunityInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdInvitations(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityInvitation.ICreate;
}): Promise<ICommunityPlatformCommunityInvitation> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify invitee exists
  const invitee = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.body.invitee_id },
  });
  if (!invitee) {
    throw new HttpException("Invitee not found", 404);
  }
  // Check if invitee is already subscribed to the community
  const existingSubscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: {
          community_platform_user_id_community_platform_community_id: {
            community_platform_community_id: props.communityId,
            community_platform_user_id: props.body.invitee_id,
          },
        },
      },
    );
  if (existingSubscription) {
    throw new HttpException(
      "User is already subscribed to this community",
      400,
    );
  }
  // Check if invitee is banned from the community
  const activeBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.invitee_id,
        expires_at: { gt: new Date() },
      },
    });
  if (activeBan) {
    throw new HttpException("User is banned from this community", 403);
  }
  // Check for existing pending invitation
  const existingInvitation =
    await MyGlobal.prisma.community_platform_community_invitations.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        invitee_id: props.body.invitee_id,
        status: "pending",
        expires_at: { gt: new Date() },
      },
    });
  if (existingInvitation) {
    throw new HttpException(
      "Pending invitation already exists for this user",
      400,
    );
  }
  // Create the invitation using collector
  const invitation =
    await MyGlobal.prisma.community_platform_community_invitations.create({
      data: await CommunityPlatformCommunityInvitationCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: props.communityId },
        communityPlatformUsers: { id: props.admin.id },
      }),
      ...CommunityPlatformCommunityInvitationTransformer.select(),
    });
  return await CommunityPlatformCommunityInvitationTransformer.transform(
    invitation,
  );
}
