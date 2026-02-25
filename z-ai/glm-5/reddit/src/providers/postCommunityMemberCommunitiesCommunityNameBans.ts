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

export async function postCommunityMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityBan.ICreate;
}): Promise<ICommunityBan> {
  // 1. Resolve community by name (case-insensitive)
  const community =
    await MyGlobal.prisma.community_communities.findFirstOrThrow({
      where: {
        name: {
          equals: props.communityName,
          mode: "insensitive",
        },
      },
    });
  // 2. Verify requester is moderator or owner of this community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: props.member.id,
    },
  });
  if (!moderatorRecord) {
    throw new HttpException(
      "Forbidden - Not a moderator of this community",
      403,
    );
  }
  // 3. Resolve target member by username
  const targetMember = await MyGlobal.prisma.community_members.findFirstOrThrow(
    {
      where: {
        username: props.body.username,
      },
    },
  );
  // 4. Business rule: Cannot ban community owner
  const ownerRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: targetMember.id,
      is_owner: true,
    },
  });
  if (ownerRecord) {
    throw new HttpException(
      "Owner cannot be banned from their own community",
      403,
    );
  }
  // 5. Business rule: Cannot ban other moderators (non-owners)
  const targetModerator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: targetMember.id,
    },
  });
  if (targetModerator) {
    throw new HttpException("Moderators cannot ban other moderators", 403);
  }
  // 6. Check for existing active ban (permanent or not yet expired)
  const now = new Date();
  const existingBan = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: community.id,
      member_id: targetMember.id,
      OR: [{ expired_at: null }, { expired_at: { gt: now } }],
    },
  });
  if (existingBan) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 7. Create ban record using collector pattern
  const createInput = await CommunityBanCollector.collect({
    body: props.body,
    communityCommunities: { id: community.id },
    communityMembers: { id: props.member.id },
    communityMemberSessions: { id: props.member.session_id },
  });
  await MyGlobal.prisma.community_bans.create({
    data: createInput,
  });
  // 8. Fetch and transform response
  const created = await MyGlobal.prisma.community_bans.findUniqueOrThrow({
    where: { id: createInput.id },
    ...CommunityBanTransformer.select(),
  });
  return await CommunityBanTransformer.transform(created);
}
