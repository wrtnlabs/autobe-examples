import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchRedditCommunityModeratorBanAppeals(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityBanAppeal.IRequest;
}): Promise<IPageIRedditCommunityBanAppeal.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (props.body.status !== undefined && props.body.status !== null) {
      conditions.status =
        props.body.status === "rejected" ? "denied" : props.body.status;
    }

    if (props.body.submitted_after || props.body.submitted_before) {
      conditions.created_at = {};
      if (props.body.submitted_after) {
        (conditions.created_at as Record<string, unknown>).gte = new Date(
          props.body.submitted_after,
        );
      }
      if (props.body.submitted_before) {
        (conditions.created_at as Record<string, unknown>).lt = new Date(
          props.body.submitted_before,
        );
      }
    }

    if (props.body.community_name) {
      conditions.ban = {
        community: {
          name: props.body.community_name,
        },
      };
    }

    if (props.body.appellant_member_id) {
      conditions.ban = {
        ...(conditions.ban as object),
        reddit_community_member_id: props.body.appellant_member_id,
      };
    }

    if (props.body.reviewed_by_moderator_id) {
      conditions.reddit_community_moderator_id =
        props.body.reviewed_by_moderator_id;
    }

    if (props.body.ban_id) {
      conditions.reddit_community_community_ban_id = props.body.ban_id;
    }

    if (props.body.search) {
      conditions.appeal_text = {
        contains: props.body.search,
      };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_ban_appeals.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: (() => {
        const sortOrder = props.body.sort_order ?? "desc";
        const sortBy = props.body.sort_by ?? "submitted_at";

        if (sortBy === "submitted_at") {
          return { created_at: sortOrder };
        } else if (sortBy === "reviewed_at") {
          return { updated_at: sortOrder };
        } else if (sortBy === "status") {
          return { status: sortOrder };
        } else {
          return { ban: { community: { name: sortOrder } } };
        }
      })(),
      include: {
        ban: {
          include: {
            bannedMember: true,
            community: true,
            banningModerator: true,
          },
        },
        reviewingModerator: true,
      },
    }),
    MyGlobal.prisma.reddit_community_ban_appeals.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((appeal) => ({
      id: appeal.id,
      status: appeal.status as
        | "pending"
        | "approved"
        | "denied"
        | "expired_no_review",
      created_at: toISOStringSafe(appeal.created_at),
      updated_at: toISOStringSafe(appeal.updated_at),
      member: {
        id: appeal.ban.bannedMember.id,
        username: appeal.ban.bannedMember.username,
        display_name:
          appeal.ban.bannedMember.display_name === null
            ? undefined
            : appeal.ban.bannedMember.display_name,
        bio:
          appeal.ban.bannedMember.bio === null
            ? undefined
            : appeal.ban.bannedMember.bio,
        avatar_url:
          appeal.ban.bannedMember.avatar_url === null
            ? undefined
            : appeal.ban.bannedMember.avatar_url,
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
        expires_at:
          appeal.ban.expires_at === null
            ? undefined
            : toISOStringSafe(appeal.ban.expires_at),
        created_at: toISOStringSafe(appeal.ban.created_at),
        updated_at: toISOStringSafe(appeal.ban.updated_at),
        deleted_at:
          appeal.ban.deleted_at === null
            ? undefined
            : toISOStringSafe(appeal.ban.deleted_at),
        banned_member: {
          id: appeal.ban.bannedMember.id,
          username: appeal.ban.bannedMember.username,
          display_name:
            appeal.ban.bannedMember.display_name === null
              ? undefined
              : appeal.ban.bannedMember.display_name,
          bio:
            appeal.ban.bannedMember.bio === null
              ? undefined
              : appeal.ban.bannedMember.bio,
          avatar_url:
            appeal.ban.bannedMember.avatar_url === null
              ? undefined
              : appeal.ban.bannedMember.avatar_url,
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
          display_name:
            appeal.ban.banningModerator.display_name === null
              ? undefined
              : appeal.ban.banningModerator.display_name,
          avatar_url:
            appeal.ban.banningModerator.avatar_url === null
              ? undefined
              : appeal.ban.banningModerator.avatar_url,
          post_karma: appeal.ban.banningModerator.post_karma,
          comment_karma: appeal.ban.banningModerator.comment_karma,
          created_at: toISOStringSafe(appeal.ban.banningModerator.created_at),
        },
      },
      moderator_response:
        appeal.moderator_response === null
          ? undefined
          : appeal.moderator_response,
    })),
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
