import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanAtSummaryTransformer } from "../transformers/RedditPlatformCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditPlatformCommunityBan.IRequest;
}): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
  const page: number = props.body.page ?? 1;
  let limit: number = props.body.limit ?? 20;
  if (limit > 100) {
    limit = 100;
  }
  const search: string | undefined = props.body.search;
  const status: "active" | "inactive" | undefined = props.body.status;
  const sortBy: "banned_at" | "user_id" | "reason" | undefined =
    props.body.sortBy;
  const sortOrder: "asc" | "desc" | undefined = props.body.sortOrder;
  const communityData =
    await MyGlobal.prisma.reddit_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (communityData === null) {
    throw new HttpException("Community not found", 404);
  }
  const communityMemberData =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        community_id: communityData.id,
        user_id: props.member.id,
        deleted_at: null,
        role: "owner",
      },
    });
  if (communityMemberData === null) {
    const moderatorData =
      await MyGlobal.prisma.reddit_platform_community_members.findFirst({
        where: {
          community_id: communityData.id,
          user_id: props.member.id,
          deleted_at: null,
          role: "moderator",
        },
      });
    if (moderatorData === null) {
      throw new HttpException("You are not a moderator of this community", 403);
    }
  }
  const whereClause: Prisma.reddit_platform_banned_usersWhereInput = {
    community_id: communityData.id,
    deleted_at: null,
  };
  if (status === "active") {
    whereClause.unbanned_at = null;
  } else if (status === "inactive") {
    whereClause.unbanned_at = {
      not: null,
    };
  }
  if (search !== undefined) {
    whereClause.reason = {
      contains: search,
      mode: "insensitive",
    };
  }
  let orderByClause: Prisma.reddit_platform_banned_usersOrderByWithRelationInput[] =
    [
      {
        banned_at: "desc",
      },
    ];
  if (sortBy === "user_id") {
    orderByClause = [
      {
        user_id: sortOrder ?? "desc",
      },
    ];
  } else if (sortBy === "reason") {
    orderByClause = [
      {
        reason: sortOrder ?? "desc",
      },
    ];
  }
  const skip: number = (page - 1) * limit;
  const records = await MyGlobal.prisma.reddit_platform_banned_users.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: skip,
    take: limit,
    ...RedditPlatformCommunityBanAtSummaryTransformer.select(),
  });
  const total: number =
    await MyGlobal.prisma.reddit_platform_banned_users.count({
      where: whereClause,
    });
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformCommunityBanAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformCommunityBan.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
// import { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberCommunitiesCommunityNameBans(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: IRedditPlatformCommunityBan.IRequest;
// }): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_banned_users.findMany({
//     ...RedditPlatformCommunityBanAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommunityBanAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------