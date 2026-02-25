import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommunityCollector } from "../collectors/CommunityCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommunityTransformer } from "../transformers/CommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityCommunity.ICreate;
}): Promise<ICommunityCommunity> {
  // Check for unique community name (case-insensitive)
  const existing = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: {
        equals: props.body.name,
        mode: "insensitive",
      },
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      `Community name '${props.body.name}' already exists`,
      409,
    );
  }
  // Prepare community data and get the generated ID
  const communityData = await CommunityCommunityCollector.collect({
    body: props.body,
    communityMember: { id: props.member.id },
  });
  const communityId = communityData.id;
  const now = communityData.created_at;
  // Atomic transaction: create community, subscription, and moderator
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create community
    await tx.community_communities.create({
      data: communityData,
    });
    // Auto-subscribe creator
    await tx.community_subscriptions.create({
      data: {
        id: v4(),
        community_member_id: props.member.id,
        community_community_id: communityId,
        created_at: now,
      },
    });
    // Create owner moderator record
    await tx.community_moderators.create({
      data: {
        id: v4(),
        community_id: communityId,
        member_id: props.member.id,
        appointed_by: null,
        is_owner: true,
        created_at: now,
        updated_at: now,
      },
    });
    // Update subscriber count to 1
    await tx.community_communities.update({
      where: { id: communityId },
      data: { subscriber_count: 1 },
    });
  });
  // Fetch and return the created community
  const community =
    await MyGlobal.prisma.community_communities.findUniqueOrThrow({
      where: { id: communityId },
      ...CommunityCommunityTransformer.select(),
    });
  return await CommunityCommunityTransformer.transform(community);
}
