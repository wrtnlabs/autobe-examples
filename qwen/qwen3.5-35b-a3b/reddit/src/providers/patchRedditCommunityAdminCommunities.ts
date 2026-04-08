import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminCommunities(props: {
  admin: AdminPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.name !== undefined && props.body.name !== ""
      ? { name: { contains: props.body.name, mode: "insensitive" as const } }
      : {}),
  };
  const orderByInput: Prisma.reddit_community_communitiesOrderByWithRelationInput[] =
    props.body.sort === "name_asc"
      ? [{ name: "asc" }]
      : props.body.sort === "name_desc"
        ? [{ name: "desc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }]
          : props.body.sort === "created_at_desc"
            ? [{ created_at: "desc" }]
            : [{ created_at: "desc" }];
  const records = await MyGlobal.prisma.reddit_community_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCommunityCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditCommunityCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
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
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminCommunities(props: {
//   admin: AdminPayload;
//   body: IRedditCommunityCommunity.IRequest;
// }): Promise<IPageIRedditCommunityCommunity.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_communities.findMany({
//     ...RedditCommunityCommunityAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityCommunityAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------