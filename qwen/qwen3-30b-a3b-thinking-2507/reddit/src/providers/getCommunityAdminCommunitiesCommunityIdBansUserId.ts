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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { CommunityCommunityAtSummaryTransformer } from "../transformers/CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "../transformers/CommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminCommunitiesCommunityIdBansUserId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityBannedUser> {
  const result = await MyGlobal.prisma.community_banned_users.findUnique({
    where: {
      user_id_community_id: {
        user_id: props.userId,
        community_id: props.communityId,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      banned_at: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      bannedUser: CommunityMemberAtSummaryTransformer.select(),
      bannedCommunity: CommunityCommunityAtSummaryTransformer.select().select,
    },
  });
  if (!result) throw new HttpException("Ban record not found", 404);
  return await CommunityBannedUserTransformer.transform(result);
}
