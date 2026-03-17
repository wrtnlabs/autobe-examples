import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
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
import { CommunityBanCollector } from "../collectors/CommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBanTransformer } from "../transformers/CommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityBan.ICreate;
}): Promise<ICommunityBan> {
  // Step 1: Resolve community (404 if not found)
  await MyGlobal.prisma.community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  // Step 2: Verify the requesting member holds owner or moderator role in this community
  const requesterRole = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (requesterRole === null) {
    throw new HttpException(
      "Forbidden: you do not have moderation rights in this community",
      403,
    );
  }
  // Step 3: Resolve the target member (404 if not found or soft-deleted)
  await MyGlobal.prisma.community_members.findFirstOrThrow({
    where: {
      id: props.body.banned_member_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 4: Prevent banning community owners or any moderator
  const targetIsModerator =
    await MyGlobal.prisma.community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.body.banned_member_id,
      },
      select: { id: true },
    });
  if (targetIsModerator !== null) {
    throw new HttpException(
      "Forbidden: community owners and moderators cannot be banned",
      403,
    );
  }
  // Step 5: Create the ban record
  const created = await MyGlobal.prisma.community_bans.create({
    data: await CommunityBanCollector.collect({
      body: props.body,
      communityCommunities: { id: props.communityId },
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityBanTransformer.select(),
  });
  // Step 6: Transform and return the full ban record
  return await CommunityBanTransformer.transform(created);
}
