import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
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
import { CommunityBannedUserCollector } from "../collectors/CommunityBannedUserCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityBannedUser.ICreate;
}): Promise<ICommunityBannedUser> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId },
    select: { owner_id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id === props.body.user_id) {
    throw new HttpException("Cannot ban community owner", 403);
  }
  const existingBan = await MyGlobal.prisma.community_banned_users.findFirst({
    where: {
      user_id: props.body.user_id,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (existingBan) {
    throw new HttpException("User already banned from this community", 409);
  }
  const createInput = await CommunityBannedUserCollector.collect({
    body: props.body,
    communityCommunities: { id: props.communityId },
  });
  const createdBan = await MyGlobal.prisma.community_banned_users.create({
    data: createInput,
  });
  return await CommunityBannedUserTransformer.transform(createdBan);
}
