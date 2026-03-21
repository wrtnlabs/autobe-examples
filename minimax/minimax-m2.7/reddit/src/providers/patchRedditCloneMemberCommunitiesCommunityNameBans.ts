import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserKarma";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneUserKarmaAtSummaryTransformer } from "../transformers/RedditCloneUserKarmaAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneUserKarma.IRequest;
}): Promise<IPageIRedditCloneUserKarma.ISummary> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  // Verify member is moderator or owner of community
  const isModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Build status filter conditions
  const statusValue = props.body.status ?? "active";
  const statusCondition: Prisma.reddit_clone_bansWhereInput =
    statusValue === "active"
      ? {
          deleted_at: null,
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        }
      : statusValue === "expired"
        ? {
            OR: [
              { deleted_at: { not: null } },
              { expires_at: { lte: new Date() } },
            ],
          }
        : {};
  // Build date range filter
  const dateRangeFilter: {
    created_at?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};
  if (props.body.startDate) {
    dateRangeFilter.created_at = {
      gte: new Date(props.body.startDate),
      ...(props.body.endDate && { lte: new Date(props.body.endDate) }),
    };
  } else if (props.body.endDate) {
    dateRangeFilter.created_at = {
      lte: new Date(props.body.endDate),
    };
  }
  // Build complete WHERE clause
  const whereInput = {
    reddit_clone_community_id: community.id,
    ...statusCondition,
    ...dateRangeFilter,
    ...(props.body.usernameSearch && {
      bannedUser: {
        username: { contains: props.body.usernameSearch, mode: "insensitive" },
      },
    }),
    ...(props.body.issuedByUsername && {
      issuer: {
        username: {
          contains: props.body.issuedByUsername,
          mode: "insensitive",
        },
      },
    }),
  } satisfies Prisma.reddit_clone_bansWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query bans
  const bans = await MyGlobal.prisma.reddit_clone_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneUserKarmaAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_clone_bans.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    bans,
    RedditCloneUserKarmaAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
