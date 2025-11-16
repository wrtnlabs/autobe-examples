import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function getRedditCommunityMembersUsername(props: {
  username: string;
}): Promise<IRedditCommunityGuest.ISummary> {
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { username: props.username },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: member.id,
    username: member.username,
    display_name:
      member.display_name === null ? undefined : member.display_name,
    bio: member.bio === null ? undefined : member.bio,
    avatar_url: member.avatar_url === null ? undefined : member.avatar_url,
    post_karma: member.post_karma,
    comment_karma: member.comment_karma,
    created_at: toISOStringSafe(member.created_at),
  };
}
