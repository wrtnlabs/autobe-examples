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

export async function getCommunityMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityBan> {
  // Step 1: Validate community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Verify requesting member holds a moderator or owner role in the community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Fetch the specific ban record scoped to this community
  const ban = await MyGlobal.prisma.community_bans.findFirstOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
    },
    ...CommunityBanTransformer.select(),
  });
  // Step 4: Transform and return the full ICommunityBan response
  return await CommunityBanTransformer.transform(ban);
}
