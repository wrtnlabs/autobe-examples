import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityCommunitiesCommunityNameModerators(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const existingModeratorRelationship =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
      },
    });

  if (!existingModeratorRelationship) {
    throw new HttpException(
      "You do not have moderator authority in this community",
      403,
    );
  }

  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { email: props.body.email },
    });

  if (existingModerator) {
    throw new HttpException("A moderator with this email already exists", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = new Date();

  const newModerator = await MyGlobal.prisma.reddit_community_moderators.create(
    {
      data: {
        id: moderatorId,
        username: props.body.nickname,
        email: props.body.email,
        password_hash: hashedPassword,
        email_verified: false,
        display_name: null,
        bio: null,
        avatar_url: null,
        post_karma: 0,
        comment_karma: 0,
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  await MyGlobal.prisma.reddit_community_community_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: moderatorId,
      community_id: community.id,
      appointed_by_member_id: props.member.id,
      is_creator: false,
      created_at: now,
    },
  });

  await MyGlobal.prisma.reddit_community_moderator_sessions.create({
    data: {
      id: sessionId,
      reddit_community_moderator_id: moderatorId,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  return {
    id: newModerator.id,
    username: newModerator.username,
    email: newModerator.email,
    email_verified: newModerator.email_verified,
    display_name: newModerator.display_name ?? undefined,
    bio: newModerator.bio ?? undefined,
    avatar_url: newModerator.avatar_url ?? undefined,
    post_karma: newModerator.post_karma,
    comment_karma: newModerator.comment_karma,
    show_online_status: newModerator.show_online_status,
    show_subscribed_communities: newModerator.show_subscribed_communities,
    show_activity_feed: newModerator.show_activity_feed,
    created_at: toISOStringSafe(newModerator.created_at),
    updated_at: toISOStringSafe(newModerator.updated_at),
    deleted_at: newModerator.deleted_at
      ? toISOStringSafe(newModerator.deleted_at)
      : undefined,
  };
}
