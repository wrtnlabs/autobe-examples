import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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

export async function patchRedditCommunityMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityBan.IRequest;
}): Promise<IPageIRedditCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_member_id: true,
      },
    });
  const isModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const isOwner = community.reddit_community_member_id === props.member.id;
  if (!isModerator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const statusFilter =
    props.body.status === "removed"
      ? { deleted_at: { not: null } }
      : { deleted_at: null };
  const whereInput: Prisma.reddit_community_bansWhereInput = {
    reddit_community_community_id: community.id,
    ...statusFilter,
    ...(props.body.search && {
      OR: [
        {
          bannedMember: {
            username: { contains: props.body.search, mode: "insensitive" },
          },
        },
        { reason: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.reddit_community_bansWhereInput;
  const orderByInput =
    props.body.sort === "created_at_asc"
      ? { created_at: Prisma.SortOrder.asc }
      : { created_at: Prisma.SortOrder.desc };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        reason: true,
        created_at: true,
        bannedMember: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
        bannedBy: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_bans.count({
      where: whereInput,
    }),
  ]);
  return {
    data: data.map(
      (ban) =>
        ({
          id: ban.id,
          bannedMember: {
            id: ban.bannedMember.id,
            username: ban.bannedMember.username,
            created_at: toISOStringSafe(ban.bannedMember.created_at),
          } satisfies IRedditCommunityMember.ISummary,
          bannedBy: {
            id: ban.bannedBy.id,
            username: ban.bannedBy.username,
            created_at: toISOStringSafe(ban.bannedBy.created_at),
          } satisfies IRedditCommunityMember.ISummary,
          reason: ban.reason ?? null,
          created_at: toISOStringSafe(ban.created_at),
        }) satisfies IRedditCommunityBan.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityBan.ISummary;
}
