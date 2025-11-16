import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorCommunitiesCommunityNameBanAppeals(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityBanAppeal.IRequest;
}): Promise<IPageIRedditCommunityBanAppeal.ISummary> {
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

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
    };

    const banConditions: Record<string, unknown> = {
      reddit_community_community_id: community.id,
    };

    if (props.body.appellant_member_id) {
      banConditions.reddit_community_member_id = props.body.appellant_member_id;
    }

    if (props.body.ban_id) {
      banConditions.id = props.body.ban_id;
    }

    conditions.ban = banConditions;

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (props.body.submitted_after || props.body.submitted_before) {
      const createdAtConditions: Record<string, unknown> = {};
      if (props.body.submitted_after) {
        createdAtConditions.gte = props.body.submitted_after;
      }
      if (props.body.submitted_before) {
        createdAtConditions.lt = props.body.submitted_before;
      }
      conditions.created_at = createdAtConditions;
    }

    if (props.body.reviewed_by_moderator_id) {
      conditions.reddit_community_moderator_id =
        props.body.reviewed_by_moderator_id;
    }

    if (props.body.search) {
      conditions.appeal_text = {
        contains: props.body.search,
        mode: "insensitive",
      };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const sortByMapping: Record<string, string> = {
    submitted_at: "created_at",
    reviewed_at: "updated_at",
    status: "status",
    community: "created_at",
  };

  const orderByField = props.body.sort_by
    ? sortByMapping[props.body.sort_by]
    : "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";

  const [appeals, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_ban_appeals.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderByDirection,
      },
      include: {
        ban: {
          include: {
            bannedMember: true,
            community: true,
            banningModerator: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_ban_appeals.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: appeals.map((appeal) => ({
      id: appeal.id,
      status: typia.assert<
        "pending" | "approved" | "denied" | "expired_no_review"
      >(appeal.status),
      created_at: toISOStringSafe(appeal.created_at),
      updated_at: toISOStringSafe(appeal.updated_at),
      member: {
        id: appeal.ban.bannedMember.id,
        username: appeal.ban.bannedMember.username,
        display_name: appeal.ban.bannedMember.display_name ?? null,
        bio: appeal.ban.bannedMember.bio ?? null,
        avatar_url: appeal.ban.bannedMember.avatar_url ?? null,
        post_karma: appeal.ban.bannedMember.post_karma,
        comment_karma: appeal.ban.bannedMember.comment_karma,
        created_at: toISOStringSafe(appeal.ban.bannedMember.created_at),
      },
      community: {
        id: appeal.ban.community.id,
        name: appeal.ban.community.name,
        display_title: appeal.ban.community.display_title,
        created_at: toISOStringSafe(appeal.ban.community.created_at),
      },
      ban: {
        id: appeal.ban.id,
        reddit_community_member_id: appeal.ban.reddit_community_member_id,
        reddit_community_community_id: appeal.ban.reddit_community_community_id,
        reddit_community_moderator_id: appeal.ban.reddit_community_moderator_id,
        reason: appeal.ban.reason,
        is_permanent: appeal.ban.expires_at === null,
        status: appeal.ban.status,
        expires_at: appeal.ban.expires_at
          ? toISOStringSafe(appeal.ban.expires_at)
          : null,
        created_at: toISOStringSafe(appeal.ban.created_at),
        updated_at: toISOStringSafe(appeal.ban.updated_at),
        deleted_at: appeal.ban.deleted_at
          ? toISOStringSafe(appeal.ban.deleted_at)
          : null,
        banned_member: {
          id: appeal.ban.bannedMember.id,
          username: appeal.ban.bannedMember.username,
          display_name: appeal.ban.bannedMember.display_name ?? null,
          bio: appeal.ban.bannedMember.bio ?? null,
          avatar_url: appeal.ban.bannedMember.avatar_url ?? null,
          post_karma: appeal.ban.bannedMember.post_karma,
          comment_karma: appeal.ban.bannedMember.comment_karma,
          created_at: toISOStringSafe(appeal.ban.bannedMember.created_at),
        },
        community: {
          id: appeal.ban.community.id,
          name: appeal.ban.community.name,
          display_title: appeal.ban.community.display_title,
          created_at: toISOStringSafe(appeal.ban.community.created_at),
        },
        moderator: {
          id: appeal.ban.banningModerator.id,
          username: appeal.ban.banningModerator.username,
          display_name: appeal.ban.banningModerator.display_name ?? null,
          avatar_url: appeal.ban.banningModerator.avatar_url ?? null,
          post_karma: appeal.ban.banningModerator.post_karma,
          comment_karma: appeal.ban.banningModerator.comment_karma,
          created_at: toISOStringSafe(appeal.ban.banningModerator.created_at),
        },
      },
      moderator_response: appeal.moderator_response ?? null,
    })),
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
