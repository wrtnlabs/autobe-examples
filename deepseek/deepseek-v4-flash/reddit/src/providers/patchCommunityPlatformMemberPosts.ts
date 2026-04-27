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

export async function patchCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 50);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const where: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.communityId) {
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.body.communityId, deleted_at: null },
      select: { id: true },
    });
    where.community_id = props.body.communityId;
  } else if (props.body.feed === "home") {
    const subscriptions =
      await MyGlobal.prisma.community_platform_community_subscriptions.findMany(
        {
          where: { member_id: props.member.id },
          select: { community_id: true },
        },
      );
    const communityIds = subscriptions.map((s) => s.community_id);
    if (communityIds.length === 0) {
      return {
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageICommunityPlatformPost.ISummary;
    }
    where.community_id = { in: communityIds };
  }
  if (props.body.search && props.body.search.trim().length > 0) {
    where.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.authorId) {
    where.member_id = props.body.authorId;
  }
  if (
    sort === "top" &&
    props.body.timeframe &&
    props.body.timeframe !== "all"
  ) {
    const nowMs = Date.now();
    let sinceMs: number;
    switch (props.body.timeframe) {
      case "hour":
        sinceMs = nowMs - 60 * 60 * 1000;
        break;
      case "today":
        sinceMs = nowMs - (nowMs % 86400000);
        break;
      case "week":
        sinceMs = nowMs - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        sinceMs = nowMs - 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        sinceMs = nowMs - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        sinceMs = 0;
    }
    where.created_at = { gte: new Date(sinceMs).toISOString() as string };
  }
  const orderBy:
    | Prisma.community_platform_postsOrderByWithRelationInput
    | Prisma.community_platform_postsOrderByWithRelationInput[] =
    sort === "new"
      ? { created_at: "desc" }
      : sort === "top"
        ? { vote_score: "desc" }
        : sort === "controversial"
          ? [{ comment_count: "desc" }, { vote_score: "asc" }]
          : [{ vote_score: "desc" }, { created_at: "desc" }];
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
  } satisfies IPageICommunityPlatformPost.ISummary;
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
// export async function patchCommunityPlatformMemberPosts(props: {
//   member: MemberPayload;
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