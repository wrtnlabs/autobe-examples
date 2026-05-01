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

export async function patchCommunityHubFeedHome(props: {
  body: ICommunityHubPost.IRequest;
}): Promise<IPageICommunityHubPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const time = props.body.time;
  let timeBoundary: string | undefined;
  if (sort === "top" && time && time !== "all") {
    const now = Date.now();
    switch (time) {
      case "today": {
        const d = new Date(now);
        timeBoundary = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
        ).toISOString();
        break;
      }
      case "week":
        timeBoundary = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "month":
        timeBoundary = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "year":
        timeBoundary = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }
  }
  const whereInput = {
    deleted_at: null,
    ...(timeBoundary ? { created_at: { gte: timeBoundary } } : {}),
  } satisfies Prisma.community_hub_postsWhereInput;
  let orderByInput:
    | Prisma.community_hub_postsOrderByWithRelationInput
    | Prisma.community_hub_postsOrderByWithRelationInput[];
  switch (sort) {
    case "hot":
      orderByInput = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
    case "new":
      orderByInput = { created_at: "desc" };
      break;
    case "top":
      orderByInput = { vote_score: "desc" };
      break;
    case "controversial":
      orderByInput = { comment_count: "desc" };
      break;
    default:
      orderByInput = [{ vote_score: "desc" }, { created_at: "desc" }];
  }
  const data = await MyGlobal.prisma.community_hub_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityHubPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_hub_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityHubPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityHubPost.ISummary;
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
// export async function patchCommunityHubFeedHome(props: {
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