import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditCommunityModeratorCommunitiesCommunityNameBans(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunityBan.ICreate;
}): Promise<IRedditCommunityCommunityBan> {
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

  const moderatorRecord =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { id: props.moderator.id },
    });

  if (!moderatorRecord) {
    throw new HttpException("Moderator record not found", 404);
  }

  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      id: props.body.banned_member_id,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const existingBan =
    await MyGlobal.prisma.reddit_community_community_bans.findFirst({
      where: {
        reddit_community_member_id: props.body.banned_member_id,
        reddit_community_community_id: community.id,
        status: "active",
        deleted_at: null,
      },
    });

  if (existingBan) {
    throw new HttpException(
      "Member is already banned from this community",
      409,
    );
  }

  const now = new Date();
  const banRecord =
    await MyGlobal.prisma.reddit_community_community_bans.create({
      data: {
        id: v4(),
        reddit_community_member_id: props.body.banned_member_id,
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: props.moderator.id,
        reason: props.body.reason,
        status: "active",
        expires_at: props.body.expires_at
          ? new Date(props.body.expires_at)
          : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: banRecord.id,
    reddit_community_member_id: banRecord.reddit_community_member_id,
    reddit_community_community_id: banRecord.reddit_community_community_id,
    reddit_community_moderator_id: banRecord.reddit_community_moderator_id,
    created_at: toISOStringSafe(banRecord.created_at),
    updated_at: toISOStringSafe(banRecord.updated_at),
    expires_at: banRecord.expires_at
      ? toISOStringSafe(banRecord.expires_at)
      : null,
    status: banRecord.status as "active" | "expired" | "lifted",
    deleted_at: banRecord.deleted_at
      ? toISOStringSafe(banRecord.deleted_at)
      : null,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      created_at: toISOStringSafe(community.created_at),
    },
    banned_member: {
      id: member.id,
      username: member.username,
    },
    banned_by_moderator: {
      id: moderatorRecord.id,
      username: moderatorRecord.username,
      display_name: moderatorRecord.display_name,
      avatar_url: moderatorRecord.avatar_url,
      post_karma: moderatorRecord.post_karma,
      comment_karma: moderatorRecord.comment_karma,
      created_at: toISOStringSafe(moderatorRecord.created_at),
    },
    reason: banRecord.reason,
  };
}
