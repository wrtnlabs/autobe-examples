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

export async function putCommunityMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string;
  body: ICommunityBan.IUpdate;
}): Promise<ICommunityBan> {
  // 1. Find community by name
  const community =
    await MyGlobal.prisma.community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  // 2. Check if member is moderator or owner of this community
  const moderator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: props.member.id,
    },
  });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Find the ban record and verify it belongs to this community
  const existingBan = await MyGlobal.prisma.community_bans.findUnique({
    where: { id: props.banId },
    select: { id: true, community_id: true },
  });
  if (!existingBan) {
    throw new HttpException("Ban not found", 404);
  }
  if (existingBan.community_id !== community.id) {
    throw new HttpException("Ban not found in this community", 404);
  }
  // 4. Update the ban record
  const updatedBan = await MyGlobal.prisma.community_bans.update({
    where: { id: props.banId },
    data: {
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.expiredAt !== undefined && {
        expired_at: props.body.expiredAt
          ? new Date(props.body.expiredAt)
          : null,
      }),
      updated_at: new Date(),
    },
    ...CommunityBanTransformer.select(),
  });
  // 5. Return transformed response
  return await CommunityBanTransformer.transform(updatedBan);
}
