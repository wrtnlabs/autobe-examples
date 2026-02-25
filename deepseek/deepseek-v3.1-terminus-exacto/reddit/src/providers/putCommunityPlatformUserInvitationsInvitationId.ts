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
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityInvitationTransformer } from "../transformers/CommunityPlatformCommunityInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserInvitationsInvitationId(props: {
  user: UserPayload;
  invitationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityInvitation.IUpdate;
}): Promise<ICommunityPlatformCommunityInvitation> {
  const now = toISOStringSafe(new Date());
  // Find the invitation with authorization check - need raw data for IDs
  const rawInvitation =
    await MyGlobal.prisma.community_platform_community_invitations.findUniqueOrThrow(
      {
        where: { id: props.invitationId },
      },
    );
  // Authorization: user must be either inviter or invitee
  if (
    rawInvitation.inviter_id !== props.user.id &&
    rawInvitation.invitee_id !== props.user.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if invitation is expired
  const expiresAt = new Date(rawInvitation.expires_at);
  const currentTime = new Date();
  if (expiresAt < currentTime && rawInvitation.status === "pending") {
    throw new HttpException("Invitation has expired", 400);
  }
  // Validate and prepare update data
  const updateData: Prisma.community_platform_community_invitationsUpdateInput =
    {
      updated_at: currentTime,
    };
  // Handle status updates with proper validation
  if (props.body.status !== undefined && props.body.status !== null) {
    await validateStatusUpdate(props.body.status, rawInvitation, props.user.id);
    updateData.status = props.body.status;
    // Set timestamps based on status change
    if (props.body.status === "accepted") {
      updateData.accepted_at = currentTime;
    } else if (props.body.status === "rejected") {
      updateData.rejected_at = currentTime;
    }
  }
  // Handle message update (only inviter can update)
  if (
    props.body.message !== undefined &&
    rawInvitation.inviter_id === props.user.id
  ) {
    updateData.message = props.body.message;
  }
  // Handle expiration update (only inviter can update)
  if (props.body.expires_at !== undefined && props.body.expires_at !== null) {
    if (rawInvitation.inviter_id !== props.user.id) {
      throw new HttpException("Only the inviter can update expiration", 403);
    }
    const newExpiresAt = new Date(props.body.expires_at);
    if (newExpiresAt <= currentTime) {
      throw new HttpException("Expiration date must be in the future", 400);
    }
    updateData.expires_at = newExpiresAt;
  }
  // Update the invitation
  await MyGlobal.prisma.community_platform_community_invitations.update({
    where: { id: props.invitationId },
    data: updateData,
  });
  // If status changed to accepted, create community subscription
  if (props.body.status === "accepted") {
    await createCommunitySubscription(
      rawInvitation.community_platform_community_id,
      rawInvitation.invitee_id,
    );
  }
  // Fetch and return the updated invitation with full transformation
  const updatedInvitation =
    await MyGlobal.prisma.community_platform_community_invitations.findUniqueOrThrow(
      {
        where: { id: props.invitationId },
        ...CommunityPlatformCommunityInvitationTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityInvitationTransformer.transform(
    updatedInvitation,
  );
}
async function validateStatusUpdate(
  newStatus: string,
  invitation: any,
  userId: string,
): Promise<void> {
  const validTransitions: Record<string, string[]> = {
    pending: ["accepted", "rejected", "expired"],
    accepted: [],
    rejected: [],
    expired: [],
  };
  if (!validTransitions[invitation.status].includes(newStatus)) {
    throw new HttpException(
      `Invalid status transition from ${invitation.status} to ${newStatus}`,
      400,
    );
  }
  // Authorization: only invitee can accept/reject
  if (
    (newStatus === "accepted" || newStatus === "rejected") &&
    invitation.invitee_id !== userId
  ) {
    throw new HttpException(
      "Only the invitee can accept or reject invitations",
      403,
    );
  }
  // Authorization: only inviter can expire
  if (newStatus === "expired" && invitation.inviter_id !== userId) {
    throw new HttpException("Only the inviter can expire invitations", 403);
  }
}
async function createCommunitySubscription(
  communityId: string,
  userId: string,
): Promise<void> {
  try {
    await MyGlobal.prisma.community_platform_community_subscriptions.create({
      data: {
        id: v4(),
        community_platform_community_id: communityId,
        community_platform_user_id: userId,
        subscribed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  } catch (error: any) {
    // Ignore duplicate subscription errors (user might already be subscribed)
    if (error.code !== "P2002") {
      throw error;
    }
  }
}
