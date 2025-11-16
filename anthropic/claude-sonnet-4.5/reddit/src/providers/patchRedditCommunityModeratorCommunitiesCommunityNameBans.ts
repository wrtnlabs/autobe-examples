import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorCommunitiesCommunityNameBans(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const baseCondition: Record<string, unknown> = {
      community: {
        name: props.communityName,
      },
      deleted_at: null,
    };

    if (props.body.search) {
      baseCondition.OR = [
        {
          bannedMember: {
            username: {
              contains: props.body.search,
            },
          },
        },
        {
          reason: {
            contains: props.body.search,
          },
        },
        {
          community: {
            name: {
              contains: props.body.search,
            },
          },
        },
      ];
    }

    if (props.body.community_name) {
      baseCondition.community = {
        name: props.body.community_name,
      };
    }

    if (props.body.banned_member_username) {
      baseCondition.bannedMember = {
        username: props.body.banned_member_username,
      };
    }

    if (props.body.moderator_username) {
      baseCondition.banningModerator = {
        username: props.body.moderator_username,
      };
    }

    if (props.body.status) {
      baseCondition.status = props.body.status;
    }

    if (props.body.is_permanent !== undefined) {
      baseCondition.expires_at = props.body.is_permanent ? null : { not: null };
    }

    if (props.body.created_from || props.body.created_to) {
      baseCondition.created_at = {};
      if (props.body.created_from) {
        (baseCondition.created_at as Record<string, unknown>).gte = new Date(
          props.body.created_from,
        );
      }
      if (props.body.created_to) {
        (baseCondition.created_at as Record<string, unknown>).lte = new Date(
          props.body.created_to,
        );
      }
    }

    if (props.body.expires_from || props.body.expires_to) {
      baseCondition.expires_at = {};
      if (props.body.expires_from) {
        (baseCondition.expires_at as Record<string, unknown>).gte = new Date(
          props.body.expires_from,
        );
      }
      if (props.body.expires_to) {
        (baseCondition.expires_at as Record<string, unknown>).lte = new Date(
          props.body.expires_to,
        );
      }
    }

    return baseCondition;
  };

  const whereCondition = buildWhereCondition();

  const buildOrderBy = () => {
    if (!props.body.sort_by) {
      return { created_at: "desc" as const };
    }

    const sortOrder = props.body.sort_order ?? "asc";

    if (props.body.sort_by === "member_username") {
      return {
        bannedMember: {
          username: sortOrder,
        },
      };
    }

    if (props.body.sort_by === "moderator_username") {
      return {
        banningModerator: {
          username: sortOrder,
        },
      };
    }

    if (props.body.sort_by === "community_name") {
      return {
        community: {
          name: sortOrder,
        },
      };
    }

    return {
      [props.body.sort_by]: sortOrder,
    };
  };

  const orderBy = buildOrderBy();

  const [bans, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_bans.findMany({
      where: whereCondition,
      include: {
        bannedMember: true,
        community: true,
        banningModerator: true,
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_community_bans.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: bans.map((ban) => ({
      id: ban.id,
      reddit_community_member_id: ban.reddit_community_member_id,
      reddit_community_community_id: ban.reddit_community_community_id,
      reddit_community_moderator_id: ban.reddit_community_moderator_id,
      reason: ban.reason,
      is_permanent: ban.expires_at === null,
      status: ban.status,
      expires_at: ban.expires_at ? toISOStringSafe(ban.expires_at) : null,
      created_at: toISOStringSafe(ban.created_at),
      updated_at: toISOStringSafe(ban.updated_at),
      deleted_at: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
      banned_member: {
        id: ban.bannedMember.id,
        username: ban.bannedMember.username,
        display_name: ban.bannedMember.display_name ?? null,
        bio: ban.bannedMember.bio ?? null,
        avatar_url: ban.bannedMember.avatar_url ?? null,
        post_karma: ban.bannedMember.post_karma,
        comment_karma: ban.bannedMember.comment_karma,
        created_at: toISOStringSafe(ban.bannedMember.created_at),
      },
      community: {
        id: ban.community.id,
        name: ban.community.name,
        display_title: ban.community.display_title,
        created_at: toISOStringSafe(ban.community.created_at),
      },
      moderator: {
        id: ban.banningModerator.id,
        username: ban.banningModerator.username,
        display_name: ban.banningModerator.display_name ?? null,
        avatar_url: ban.banningModerator.avatar_url ?? null,
        post_karma: ban.banningModerator.post_karma,
        comment_karma: ban.banningModerator.comment_karma,
        created_at: toISOStringSafe(ban.banningModerator.created_at),
      },
    })),
  };
}
