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
  // Authorization: Verify member is a moderator or owner of the community
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
  const isOwner = community?.reddit_clone_member_id === props.member.id;
  if (!moderator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with filters
  const conditions: Prisma.reddit_clone_bansWhereInput[] = [];
  // Filter by banned user ID
  if (props.body.bannedUserId) {
    conditions.push({ reddit_clone_user_id: props.body.bannedUserId });
  }
  // Filter by issuer moderator ID
  if (props.body.issuerId) {
    conditions.push({ issued_by_reddit_clone_user_id: props.body.issuerId });
  }
  // Filter by username (requires join with bannedUser relation)
  if (props.body.bannedUsername) {
    conditions.push({
      bannedUser: { username: { contains: props.body.bannedUsername } },
    });
  }
  // Filter by status
  if (props.body.status) {
    switch (props.body.status) {
      case "active":
        conditions.push({ deleted_at: null });
        conditions.push({
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        });
        break;
      case "expired":
        conditions.push({ expires_at: { not: null } });
        conditions.push({ expires_at: { lte: new Date() } });
        break;
      case "revoked":
        conditions.push({ deleted_at: { not: null } });
        break;
    }
  }
  // Filter by date range
  if (props.body.startDate) {
    conditions.push({ created_at: { gte: new Date(props.body.startDate) } });
  }
  if (props.body.endDate) {
    conditions.push({ created_at: { lte: new Date(props.body.endDate) } });
  }
  const whereInput = {
    reddit_clone_community_id: props.communityId,
    ...(conditions.length > 0 && { AND: conditions }),
  } satisfies Prisma.reddit_clone_bansWhereInput;
  // Sorting
  const order = props.body.order ?? "desc";
  const orderByInput = (
    props.body.sort === "reason"
      ? { reason: order }
      : props.body.sort === "expires_at"
        ? { expires_at: order }
        : { created_at: order }
  ) satisfies Prisma.reddit_clone_bansOrderByWithRelationInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute queries
  const records = await MyGlobal.prisma.reddit_clone_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommunityBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_bans.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
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