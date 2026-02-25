import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityModeratorCollector } from "../collectors/CommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityModeratorTransformer } from "../transformers/CommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityModerator.ICreate;
}): Promise<ICommunityModerator> {
  // Step 1: Find the community by name
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Step 2: Check if the authenticated member is owner or moderator
  const existingModerator =
    await MyGlobal.prisma.community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
      },
    });
  if (existingModerator === null && community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Find target member by username
  const targetMember = await MyGlobal.prisma.community_members.findFirst({
    where: {
      username: props.body.member_username,
      deleted_at: null,
    },
  });
  if (targetMember === null) {
    throw new HttpException("Target member not found", 404);
  }
  // Step 4: Verify target is not the owner
  if (targetMember.id === community.owner_id) {
    throw new HttpException("Target member is the community owner", 400);
  }
  // Step 5: Verify target is subscribed to the community
  const subscription = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: targetMember.id,
      community_community_id: community.id,
    },
  });
  if (subscription === null) {
    throw new HttpException(
      "Target member is not subscribed to the community",
      400,
    );
  }
  // Step 6: Verify target is not already a moderator
  const alreadyModerator = await MyGlobal.prisma.community_moderators.findFirst(
    {
      where: {
        community_id: community.id,
        member_id: targetMember.id,
      },
    },
  );
  if (alreadyModerator !== null) {
    throw new HttpException("Target member is already a moderator", 409);
  }
  // Step 7: Create moderator record using collector
  const createInput = await CommunityModeratorCollector.collect({
    body: props.body,
    communityCommunities: { id: community.id },
    communityMembers: { id: props.member.id },
  });
  const created = await MyGlobal.prisma.community_moderators.create({
    data: createInput,
    ...CommunityModeratorTransformer.select(),
  });
  // Step 8: Transform and return
  return await CommunityModeratorTransformer.transform(created);
}
