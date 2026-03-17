import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBan";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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

export async function patchRedditCloneMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneBan.IRequest;
}): Promise<IPageIRedditCloneBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.reddit_clone_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          member: {
            username: { contains: props.body.search, mode: "insensitive" },
          },
        },
        {
          issuer: {
            username: { contains: props.body.search, mode: "insensitive" },
          },
        },
        { reason: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.reddit_clone_bansWhereInput;
  const orderByInput = (
    props.body.sort === "member"
      ? { member: { username: "asc" as const } }
      : props.body.sort === "issuer"
        ? { issuer: { username: "asc" as const } }
        : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_clone_bansOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      reason: true,
      created_at: true,
      member: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
          created_at: true,
          karmaScore: {
            select: {
              score: true,
            },
          },
        },
      } satisfies Prisma.reddit_clone_membersFindManyArgs,
      issuer: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
          created_at: true,
          karmaScore: {
            select: {
              score: true,
            },
          },
        },
      } satisfies Prisma.reddit_clone_membersFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_bans.count({
    where: whereInput,
  });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: data.map((ban) => {
      const memberKarma = ban.member.karmaScore?.score ?? 0;
      const issuerKarma = ban.issuer.karmaScore?.score ?? 0;
      return {
        id: ban.id,
        reason: ban.reason,
        created_at: toISOStringSafe(ban.created_at),
        member: {
          id: ban.member.id,
          username: ban.member.username,
          display_name: ban.member.display_name,
          avatar: ban.member.avatar ?? null,
          karma_score: memberKarma,
          created_at: toISOStringSafe(ban.member.created_at),
        } satisfies IRedditCloneMember.ISummary,
        issuer: {
          id: ban.issuer.id,
          username: ban.issuer.username,
          display_name: ban.issuer.display_name,
          avatar: ban.issuer.avatar ?? null,
          karma_score: issuerKarma,
          created_at: toISOStringSafe(ban.issuer.created_at),
        } satisfies IRedditCloneMember.ISummary,
      };
    }),
  } satisfies IPageIRedditCloneBan.ISummary;
}
