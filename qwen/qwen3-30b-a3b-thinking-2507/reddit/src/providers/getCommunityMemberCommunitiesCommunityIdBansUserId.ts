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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberCommunitiesCommunityIdBansUserId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityBannedUser> {
  const moderator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      user_id: props.member.id,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (!moderator) {
    throw new HttpException("Unauthorized access to community moderation", 403);
  }
  const banRecord = await MyGlobal.prisma.community_banned_users.findUnique({
    where: {
      user_id_community_id: {
        user_id: props.userId,
        community_id: props.communityId,
      },
      deleted_at: null,
    },
    select: CommunityBannedUserTransformer.select().select,
  });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  return await CommunityBannedUserTransformer.transform(banRecord);
}
