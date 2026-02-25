import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityModerationLogTransformer } from "../transformers/CommunityModerationLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberCommunitiesCommunityNameModerationLogsLogId(props: {
  member: MemberPayload;
  communityName: string;
  logId: string;
}): Promise<ICommunityModerationLog> {
  // Find the community by name
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { name: props.communityName },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify member is a moderator or owner of this community
  const moderator = await MyGlobal.prisma.community_moderators.findUnique({
    where: {
      community_id_member_id: {
        community_id: community.id,
        member_id: props.member.id,
      },
    },
  });
  if (!moderator) {
    throw new HttpException(
      "Forbidden - You are not a moderator of this community",
      403,
    );
  }
  // Query the moderation log using transformer select
  const log = await MyGlobal.prisma.community_moderation_logs.findFirst({
    where: {
      id: props.logId,
      community_id: community.id,
    },
    ...CommunityModerationLogTransformer.select(),
  });
  if (!log) {
    throw new HttpException("Moderation log not found", 404);
  }
  return await CommunityModerationLogTransformer.transform(log);
}
