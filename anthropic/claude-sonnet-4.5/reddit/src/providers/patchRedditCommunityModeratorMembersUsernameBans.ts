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

export async function patchRedditCommunityModeratorMembersUsernameBans(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IRedditCommunityCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityCommunityBan.ISummary> {
  const { username, body } = props;

  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      username: username,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [bans, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_bans.findMany({
      where: {
        reddit_community_member_id: member.id,
        deleted_at: null,
        ...(body.status && { status: body.status }),
        ...(body.is_permanent !== undefined &&
          body.is_permanent !== null && {
            expires_at: body.is_permanent ? null : { not: null },
          }),
        ...(body.community_name && {
          community: {
            name: body.community_name,
          },
        }),
        ...(body.moderator_username && {
          banningModerator: {
            username: body.moderator_username,
          },
        }),
        ...((body.created_from || body.created_to) && {
          created_at: {
            ...(body.created_from && { gte: new Date(body.created_from) }),
            ...(body.created_to && { lte: new Date(body.created_to) }),
          },
        }),
        ...((body.expires_from || body.expires_to) && {
          expires_at: {
            ...(body.expires_from && { gte: new Date(body.expires_from) }),
            ...(body.expires_to && { lte: new Date(body.expires_to) }),
          },
        }),
        ...(body.search && {
          OR: [
            { reason: { contains: body.search, mode: "insensitive" } },
            {
              bannedMember: {
                username: { contains: body.search, mode: "insensitive" },
              },
            },
            {
              community: {
                name: { contains: body.search, mode: "insensitive" },
              },
            },
          ],
        }),
      },
      skip: skip,
      take: limit,
      orderBy: body.sort_by
        ? body.sort_by === "created_at" || body.sort_by === "expires_at"
          ? { [body.sort_by]: body.sort_order ?? "asc" }
          : body.sort_by === "community_name"
            ? {
                community: {
                  name: body.sort_order ?? "asc",
                },
              }
            : body.sort_by === "member_username"
              ? {
                  bannedMember: {
                    username: body.sort_order ?? "asc",
                  },
                }
              : body.sort_by === "moderator_username"
                ? {
                    banningModerator: {
                      username: body.sort_order ?? "asc",
                    },
                  }
                : { created_at: "desc" }
        : { created_at: "desc" },
      include: {
        bannedMember: true,
        community: true,
        banningModerator: true,
      },
    }),
    MyGlobal.prisma.reddit_community_community_bans.count({
      where: {
        reddit_community_member_id: member.id,
        deleted_at: null,
        ...(body.status && { status: body.status }),
        ...(body.is_permanent !== undefined &&
          body.is_permanent !== null && {
            expires_at: body.is_permanent ? null : { not: null },
          }),
        ...(body.community_name && {
          community: {
            name: body.community_name,
          },
        }),
        ...(body.moderator_username && {
          banningModerator: {
            username: body.moderator_username,
          },
        }),
        ...((body.created_from || body.created_to) && {
          created_at: {
            ...(body.created_from && { gte: new Date(body.created_from) }),
            ...(body.created_to && { lte: new Date(body.created_to) }),
          },
        }),
        ...((body.expires_from || body.expires_to) && {
          expires_at: {
            ...(body.expires_from && { gte: new Date(body.expires_from) }),
            ...(body.expires_to && { lte: new Date(body.expires_to) }),
          },
        }),
        ...(body.search && {
          OR: [
            { reason: { contains: body.search, mode: "insensitive" } },
            {
              bannedMember: {
                username: { contains: body.search, mode: "insensitive" },
              },
            },
            {
              community: {
                name: { contains: body.search, mode: "insensitive" },
              },
            },
          ],
        }),
      },
    }),
  ]);

  const data: IRedditCommunityCommunityBan.ISummary[] = bans.map((ban) => ({
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
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data,
  };
}
