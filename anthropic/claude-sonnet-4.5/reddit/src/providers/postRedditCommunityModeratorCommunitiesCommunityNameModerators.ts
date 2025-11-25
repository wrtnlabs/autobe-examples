import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditCommunityModeratorCommunitiesCommunityNameModerators(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const requestingModeratorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.moderator.id,
      },
    });

  if (!requestingModeratorAssignment) {
    throw new HttpException("You do not have authority in this community", 403);
  }

  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        email: props.body.email,
      },
    });

  if (existingModerator) {
    throw new HttpException("Moderator with this email already exists", 400);
  }

  const username =
    props.body.nickname.toLowerCase().replace(/\s+/g, "_") +
    "_" +
    v4().substring(0, 8);
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = new Date();

  const newModerator = await MyGlobal.prisma.reddit_community_moderators.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        username: username,
        email: props.body.email,
        password_hash: hashedPassword,
        email_verified: false,
        display_name: props.body.nickname,
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
      community_id: community.id,
      member_id: newModerator.id,
      appointed_by_member_id: props.moderator.id,
      is_creator: false,
      created_at: now,
    },
  });

  return {
    id: newModerator.id as string & tags.Format<"uuid">,
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
