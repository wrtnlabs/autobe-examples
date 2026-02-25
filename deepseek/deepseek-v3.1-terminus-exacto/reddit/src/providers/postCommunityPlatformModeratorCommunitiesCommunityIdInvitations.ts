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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityInvitationTransformer } from "../transformers/CommunityPlatformCommunityInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdInvitations(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityInvitation.ICreate;
}): Promise<ICommunityPlatformCommunityInvitation> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Verify moderator has permission to invite (must be community moderator or owner)
  const moderatorCheck =
    await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          community: { id: props.communityId },
          user: { id: props.moderator.id },
        },
        select: { id: true },
      },
    );
  // Verify invitee exists and is a valid user
  await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
    where: { id: props.body.invitee_id },
    select: { id: true },
  });
  // Check if invitee is already subscribed to community
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
    throw new HttpException("User already subscribed to community", 400);
  }
  // Check if invitee is banned from community
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        community: { id: props.communityId },
        user: { id: props.body.invitee_id },
        status: "active",
        OR: [{ expires_at: { gt: new Date() } }, { expires_at: null }],
      },
    },
  );
  if (ban) {
    throw new HttpException("User is banned from this community", 403);
  }
  // Check for existing pending invitation to prevent duplicates
  const existingInvitation =
    await MyGlobal.prisma.community_platform_community_invitations.findFirst({
      where: {
        community: { id: props.communityId },
        invitee: { id: props.body.invitee_id },
        status: "pending",
        expires_at: { gt: new Date() },
      },
    });
  if (existingInvitation) {
    throw new HttpException("Pending invitation already exists", 409);
  }
  // Create invitation using collector
  const invitation =
    await MyGlobal.prisma.community_platform_community_invitations.create({
      data: await CommunityPlatformCommunityInvitationCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: props.communityId },
        communityPlatformUsers: { id: props.moderator.id },
      }),
      ...CommunityPlatformCommunityInvitationTransformer.select(),
    });
  // Transform and return
  return await CommunityPlatformCommunityInvitationTransformer.transform(
    invitation,
  );
}
