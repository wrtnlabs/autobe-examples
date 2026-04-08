import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesSearch(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
  };
  if (props.body.q !== undefined && props.body.q.length > 0) {
    whereInput.name = {
      contains: props.body.q,
      mode: "insensitive",
    };
  }
  if (
    props.body.name_search !== undefined &&
    props.body.name_search.length > 0
  ) {
    whereInput.name = {
      contains: props.body.name_search,
      mode: "insensitive",
    };
  }
  const orderBy: Array<Prisma.reddit_platform_communitiesOrderByWithRelationInput> =
    [];
  if (props.body.sortBy === "name") {
    orderBy.push({
      name: props.body.sortOrder === "asc" ? "asc" : "desc",
    });
  } else if (props.body.sortBy === "created_at") {
    orderBy.push({
      created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    });
  } else {
    orderBy.push({
      created_at: "desc",
    });
  }
  const records = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformCommunityAtSummaryTransformer.transform,
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
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberCommunitiesSearch(props: {
//   member: MemberPayload;
//   body: IRedditPlatformCommunity.IRequest;
// }): Promise<IPageIRedditPlatformCommunity.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_communities.findMany({
//     ...RedditPlatformCommunityAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommunityAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------