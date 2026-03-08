import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityNameBans(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  communityName: string;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Step 1: Find community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
      select: { id: true, owner_id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Step 2: Authorization - check if requester is owner or active moderator
  const isOwner = community.owner_id === props.member.id;
  let isModerator = false;
  if (!isOwner) {
    const moderatorRecord =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: community.id,
          member_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    isModerator = moderatorRecord !== null;
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 3: Owner immunity - owners cannot be banned
  if (props.body.bannedUserId === community.owner_id) {
    throw new HttpException("Cannot ban community owner", 403);
  }
  // Step 4: Moderator hierarchy - moderators cannot ban other moderators
  if (!isOwner) {
    const targetModeratorRecord =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: community.id,
          member_id: props.body.bannedUserId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (targetModeratorRecord !== null) {
      throw new HttpException("Cannot ban another moderator", 403);
    }
  }
  // Step 5: Duplicate ban check
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_id: community.id,
        banned_user_id: props.body.bannedUserId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // Step 6: Verify target user exists
  const targetUser =
    await MyGlobal.prisma.community_platform_members.findUnique({
      where: { id: props.body.bannedUserId },
      select: { id: true },
    });
  if (targetUser === null) {
    throw new HttpException("User not found", 404);
  }
  // Step 7: Create ban record using Collector
  const banData = await CommunityPlatformCommunityBanCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: community.id },
    communityPlatformMembers: { id: props.member.id },
  });
  const createdBan =
    await MyGlobal.prisma.community_platform_community_bans.create({
      data: banData,
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  // Step 8: Transform and return
  return await CommunityPlatformCommunityBanTransformer.transform(createdBan);
}
