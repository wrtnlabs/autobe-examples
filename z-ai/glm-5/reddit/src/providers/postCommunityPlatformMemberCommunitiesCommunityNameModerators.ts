import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorCollector } from "../collectors/CommunityPlatformCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // 1. Lookup community by name (case-insensitive)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Authorization check - caller must be owner or existing moderator
  const isOwner = community.owner_id === props.member.id;
  const existingModerator = isOwner
    ? true
    : await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: community.id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
  if (!isOwner && existingModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Lookup target member by username
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: {
        username: props.body.username,
        deleted_at: null,
      },
    });
  if (targetMember === null) {
    throw new HttpException("Member not found", 404);
  }
  // 4. Check for duplicate moderator
  const existingModRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: targetMember.id,
        deleted_at: null,
      },
    });
  if (existingModRecord !== null) {
    throw new HttpException("Member is already a moderator", 409);
  }
  // 5. Create moderator record using collector
  const created =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data: await CommunityPlatformCommunityModeratorCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: community.id },
      }),
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  // 6. Return transformed response
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    created,
  );
}
