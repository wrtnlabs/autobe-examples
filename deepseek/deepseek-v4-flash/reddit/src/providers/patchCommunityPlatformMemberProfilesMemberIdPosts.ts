import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformMemberProfilesMemberIdPosts(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Build WHERE clause: filter by profile owner (memberId), exclude soft-deleted posts
  const where: Prisma.community_platform_postsWhereInput = {
    member_id: props.memberId,
    deleted_at: null,
  };
  // Optional: scope to a specific community
  if (props.body.communityId !== undefined) {
    where.community_id = props.body.communityId;
  }
  // Optional: case-insensitive title search
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    where.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Optional: timeframe filter for 'top' sort mode
  // new Date() is required by Prisma's DateTime API for the gte filter
  if (
    props.body.sort === "top" &&
    props.body.timeframe !== undefined &&
    props.body.timeframe !== "all"
  ) {
    const now = Date.now();
    let intervalStart: number;
    switch (props.body.timeframe) {
      case "hour":
        intervalStart = now - 60 * 60 * 1000;
        break;
      case "today":
        intervalStart =
          now -
          ((now % (24 * 60 * 60 * 1000)) +
            new Date().getTimezoneOffset() * 60 * 1000);
        break;
      case "week":
        intervalStart = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        intervalStart = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        intervalStart = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }
    where.created_at = { gte: new Date(intervalStart) };
  }
  // Determine sort order
  const sort = props.body.sort ?? "hot";
  let orderBy: Prisma.community_platform_postsOrderByWithRelationInput[];
  switch (sort) {
    case "new":
      orderBy = [{ created_at: "desc" }];
      break;
    case "top":
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
    case "hot":
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
    case "controversial":
      orderBy = [{ vote_score: "asc" }, { created_at: "desc" }];
      break;
    default:
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
  }
  // Offset-based pagination (page is 1-indexed)
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Sequential queries: findMany first, then count (NOT Promise.all)
  const records = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where,
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
      CommunityPlatformPostAtSummaryTransformer.transform,
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
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberProfilesMemberIdPosts(props: {
//   member: MemberPayload;
//   memberId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformPost.IRequest;
// }): Promise<IPageICommunityPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_posts.findMany({
//     ...CommunityPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------