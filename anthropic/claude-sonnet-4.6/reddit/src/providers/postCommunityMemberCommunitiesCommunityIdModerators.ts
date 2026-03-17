import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
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

export async function postCommunityMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityModerator.ICreate;
}): Promise<ICommunityModerator> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Verify community exists and is active
    const community = await tx.community_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (community === null) {
      throw new HttpException("Community not found", 404);
    }
    // Step 2: Verify caller holds elevated role (owner or moderator) in this community
    const callerRole = await tx.community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.member.id,
      },
      select: { id: true },
    });
    if (callerRole === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Step 3: Verify target member exists and is active
    const targetMember = await tx.community_members.findFirst({
      where: {
        id: props.body.member_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (targetMember === null) {
      throw new HttpException("Target member not found", 404);
    }
    // Step 4: Check for duplicate moderator assignment
    const existing = await tx.community_moderators.findUnique({
      where: {
        community_id_member_id: {
          community_id: props.communityId,
          member_id: props.body.member_id,
        },
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException(
        "Member is already a moderator or owner of this community",
        409,
      );
    }
    // Step 5: Create moderator record using collector
    const createData = await CommunityModeratorCollector.collect({
      body: props.body,
      communityCommunities: { id: props.communityId },
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    });
    const created = await tx.community_moderators.create({
      data: createData,
      ...CommunityModeratorTransformer.select(),
    });
    return await CommunityModeratorTransformer.transform(created);
  });
}
