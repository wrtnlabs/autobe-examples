import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditCommunityMemberMembersUsername(props: {
  member: MemberPayload;
  username: string;
  body: IRedditCommunityGuest.IUpdate;
}): Promise<IRedditCommunityGuest.ISummary> {
  const existing = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { username: props.username },
  });

  if (!existing) {
    throw new HttpException("Member not found", 404);
  }

  if (existing.id !== props.member.id) {
    throw new HttpException("You can only update your own profile", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_members.update({
    where: { username: props.username },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      ...(props.body.show_online_status !== undefined && {
        show_online_status: props.body.show_online_status,
      }),
      ...(props.body.show_subscribed_communities !== undefined && {
        show_subscribed_communities: props.body.show_subscribed_communities,
      }),
      ...(props.body.show_activity_feed !== undefined && {
        show_activity_feed: props.body.show_activity_feed,
      }),
    },
  });

  return {
    id: updated.id,
    username: updated.username,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    avatar_url: updated.avatar_url ?? undefined,
    post_karma: updated.post_karma,
    comment_karma: updated.comment_karma,
    created_at: toISOStringSafe(updated.created_at),
  };
}
