import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubPostAtSummaryTransformer } from "../transformers/CommunityHubPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubCommunitiesCommunityNameFeed(props: {
  communityName: string;
  body: ICommunityHubPost.IRequest;
}): Promise<IPageICommunityHubPost.ISummary> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.community_hub_postsWhereInput = {
    community_hub_community_id: community.id,
    deleted_at: null,
  };
  const sort: string = props.body.sort ?? "hot";
  const time: string | undefined = props.body.time;
  if (sort === "top" && time !== undefined && time !== "all") {
    const nowTimestamp: number = Date.now();
    const msPerDay: number = 86400000;
    let startTimestamp: number;
    switch (time) {
      case "today": {
        startTimestamp = Math.floor(nowTimestamp / msPerDay) * msPerDay;
        break;
      }
      case "week":
        startTimestamp = nowTimestamp - 7 * msPerDay;
        break;
      case "month":
        startTimestamp = nowTimestamp - 30 * msPerDay;
        break;
      case "year":
        startTimestamp = nowTimestamp - 365 * msPerDay;
        break;
      default:
        startTimestamp = 0;
    }
    where.created_at = { gte: new Date(startTimestamp).toISOString() };
  }
  let orderBy:
    | Prisma.community_hub_postsOrderByWithRelationInput
    | Prisma.community_hub_postsOrderByWithRelationInput[];
  switch (sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { vote_score: "desc" };
      break;
    case "controversial":
      orderBy = [{ comment_count: "desc" }, { created_at: "desc" }];
      break;
    case "hot":
    default:
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
  }
  const data = await MyGlobal.prisma.community_hub_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...CommunityHubPostAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.community_hub_posts.count({
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
      data,
      CommunityHubPostAtSummaryTransformer.transform,
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
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubCommunitiesCommunityNameFeed(props: {
//   communityName: string;
//   body: ICommunityHubPost.IRequest;
// }): Promise<IPageICommunityHubPost.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_posts.findMany({
//     ...CommunityHubPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------