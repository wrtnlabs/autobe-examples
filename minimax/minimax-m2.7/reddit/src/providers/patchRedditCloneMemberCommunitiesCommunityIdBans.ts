import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityBanAtSummaryTransformer } from "../transformers/RedditCloneCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityBan.IRequest;
}): Promise<IPageIRedditCloneCommunityBan.ISummary> {
  // Authorization: Verify member is moderator or owner of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: { reddit_clone_member_id: true },
  });
  if (!moderator && community?.reddit_clone_member_id !== props.member.id) {
    throw new HttpException(
      "You are not a moderator or owner of this community",
      403,
    );
  }
  // Build where clause with filters
  const whereClause: Prisma.reddit_clone_bansWhereInput = {
    reddit_clone_community_id: props.communityId,
  };
  // Filter by banned user ID
  if (props.body.bannedUserId !== undefined) {
    whereClause.reddit_clone_user_id = props.body.bannedUserId;
  }
  // Filter by banned username (JOIN via relation)
  if (props.body.bannedUsername !== undefined) {
    whereClause.bannedUser = {
      username: {
        contains: props.body.bannedUsername,
        mode: "insensitive",
      },
    };
  }
  // Filter by issuer (moderator who issued the ban)
  if (props.body.issuerId !== undefined) {
    whereClause.issued_by_reddit_clone_user_id = props.body.issuerId;
  }
  // Filter by status
  if (props.body.status !== undefined) {
    switch (props.body.status) {
      case "active":
        whereClause.deleted_at = null;
        whereClause.OR = [
          { expires_at: null },
          { expires_at: { gt: new Date() } },
        ];
        break;
      case "expired":
        whereClause.expires_at = { lte: new Date() };
        break;
      case "revoked":
        whereClause.deleted_at = { not: null };
        break;
    }
  }
  // Filter by date range
  if (props.body.startDate !== undefined) {
    whereClause.created_at = { gte: new Date(props.body.startDate) };
  }
  if (props.body.endDate !== undefined) {
    if (!whereClause.created_at) {
      whereClause.created_at = {};
    }
    (whereClause.created_at as Prisma.DateTimeFilter).lte = new Date(
      props.body.endDate,
    );
  }
  // Build order by clause
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput: Prisma.reddit_clone_bansOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query bans with filters and pagination
  const records = await MyGlobal.prisma.reddit_clone_bans.findMany({
    where: whereClause,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCloneCommunityBanAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_bans.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneCommunityBanAtSummaryTransformer.transform,
    ),
  };
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
// import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
// import { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberCommunitiesCommunityIdBans(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityBan.IRequest;
// }): Promise<IPageIRedditCloneCommunityBan.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_bans.findMany({
//     ...RedditCloneCommunityBanAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneCommunityBanAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------