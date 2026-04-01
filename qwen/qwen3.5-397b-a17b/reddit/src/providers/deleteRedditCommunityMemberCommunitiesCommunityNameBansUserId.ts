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

export async function deleteRedditCommunityMemberCommunitiesCommunityNameBansUserId(props: {
  member: MemberPayload;
  communityName: string;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
      select: { id: true, reddit_community_member_id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const isOwner = community.reddit_community_member_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          community_id: community.id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const ban = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      reddit_community_community_id: community.id,
      reddit_community_member_id: props.userId,
      deleted_at: null,
    },
  });
  if (ban === null) {
    throw new HttpException("Ban not found", 404);
  }
  await MyGlobal.prisma.reddit_community_bans.update({
    where: { id: ban.id },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
