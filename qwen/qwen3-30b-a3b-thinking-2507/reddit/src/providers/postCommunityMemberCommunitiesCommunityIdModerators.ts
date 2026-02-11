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
  communityId: string;
  body: ICommunityModerator.ICreate;
}): Promise<ICommunityModerator> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId },
  });
  if (!community) throw new HttpException("Community not found", 404);
  const memberIsModerator =
    await MyGlobal.prisma.community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!memberIsModerator)
    throw new HttpException("You are not a moderator of this community", 403);
  const targetUser = await MyGlobal.prisma.community_members.findUnique({
    where: { id: props.body.user_id, deleted_at: null },
  });
  if (!targetUser) throw new HttpException("User not found or inactive", 404);
  const created = await MyGlobal.prisma.community_moderators.create({
    data: await CommunityModeratorCollector.collect({
      body: props.body,
      communityCommunities: community,
    }),
  });
  return await CommunityModeratorTransformer.transform(created);
}
