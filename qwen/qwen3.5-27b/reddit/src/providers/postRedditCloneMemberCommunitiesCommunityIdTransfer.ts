import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdTransfer(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunity.ITransfer;
}): Promise<IRedditCloneCommunity> {
  // Step 1: Get the community and verify ownership
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
      },
    });
  // Step 2: Verify current user is the owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - only the community owner can transfer ownership",
      403,
    );
  }
  // Step 3: Verify new owner is not the same as current owner
  if (props.body.new_owner_id === props.member.id) {
    throw new HttpException("Cannot transfer ownership to yourself", 400);
  }
  // Step 4: Verify new owner exists and is not deleted
  const newOwner = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow(
    {
      where: {
        id: props.body.new_owner_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  // Step 5: Check if new owner is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.body.new_owner_id,
      deleted_at: null,
      lifted_at: null,
    },
  });
  if (ban) {
    throw new HttpException(
      "Cannot transfer ownership to a banned member",
      403,
    );
  }
  // Step 6: Check if new owner is already a moderator
  const existingModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_communities_id: props.communityId,
        reddit_clone_members_id: props.body.new_owner_id,
        deleted_at: null,
      },
    });
  // Step 7: Perform the transfer in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update community owner
    await tx.reddit_clone_communities.update({
      where: { id: props.communityId },
      data: {
        owner_id: props.body.new_owner_id,
        updated_at: new Date(),
      },
    });
    // Handle new owner moderator record
    if (!existingModerator) {
      // Create new moderator record with role 'owner'
      await tx.reddit_clone_community_moderators.create({
        data: {
          id: v4(),
          reddit_clone_communities_id: props.communityId,
          reddit_clone_members_id: props.body.new_owner_id,
          role: "owner",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    } else {
      // Update existing moderator to owner role
      await tx.reddit_clone_community_moderators.update({
        where: { id: existingModerator.id },
        data: {
          role: "owner",
          updated_at: new Date(),
        },
      });
    }
    // Handle current owner - downgrade to mod if they stay
    const currentOwnerModerator =
      await tx.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_communities_id: props.communityId,
          reddit_clone_members_id: props.member.id,
          deleted_at: null,
        },
      });
    if (currentOwnerModerator) {
      await tx.reddit_clone_community_moderators.update({
        where: { id: currentOwnerModerator.id },
        data: {
          role: "mod",
          updated_at: new Date(),
        },
      });
    }
    // Create audit log
    await tx.reddit_clone_admin_audit_logs.create({
      data: {
        id: v4(),
        reddit_clone_admin_id: props.member.id,
        action_type: "COMMUNITY_OWNERSHIP_TRANSFER",
        target_type: "COMMUNITY",
        target_id: props.communityId,
        details: JSON.stringify({
          previous_owner_id: props.member.id,
          new_owner_id: props.body.new_owner_id,
        }),
        ip_address: "0.0.0.0",
        user_agent: null,
        created_at: new Date(),
      },
    });
    // Return the updated community with owner info
    return tx.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCloneCommunityTransformer.select(),
    });
  });
  return await RedditCloneCommunityTransformer.transform(result);
}
