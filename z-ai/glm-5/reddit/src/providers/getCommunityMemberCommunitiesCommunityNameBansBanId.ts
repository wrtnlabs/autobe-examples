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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBanTransformer } from "../transformers/CommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string;
}): Promise<ICommunityBan> {
  // 1. Find community by name
  const community =
    await MyGlobal.prisma.community_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  // 2. Verify moderator/owner status
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findUnique(
    {
      where: {
        community_id_member_id: {
          community_id: community.id,
          member_id: props.member.id,
        },
      },
    },
  );
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Find the ban record
  const ban = await MyGlobal.prisma.community_bans.findUniqueOrThrow({
    where: { id: props.banId },
    ...CommunityBanTransformer.select(),
  });
  // 4. Verify ban belongs to this community (security check)
  if (ban.community.id !== community.id) {
    throw new HttpException("Not Found", 404);
  }
  // 5. Transform and return
  return CommunityBanTransformer.transform(ban);
}
