import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban = await MyGlobal.prisma.reddit_community_bans.findUnique({
    where: { id: props.banId, community_id: props.communityId },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  const community = await MyGlobal.prisma.reddit_communities.findUnique({
    where: { id: props.communityId },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.reddit_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_bans.delete({
    where: { id: props.banId },
  });
  await MyGlobal.prisma.reddit_moderation_logs.create({
    data: {
      moderator: { connect: { id: props.member.id } },
      ban_id: props.banId,
      community_id: props.communityId,
      reason: `Ban revoked for user ${ban.user_id}`,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
