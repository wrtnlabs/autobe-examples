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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestCommunities(props: {
  guest: GuestPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const where: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
  };
  if (props.body.name !== undefined) {
    where.name = {
      contains: props.body.name,
      mode: "insensitive",
    };
  }
  const orderBy: Prisma.reddit_community_communitiesOrderByWithRelationInput[] =
    props.body.sort !== undefined
      ? (() => {
          switch (props.body.sort) {
            case "name_asc":
              return [{ name: "asc" }];
            case "name_desc":
              return [{ name: "desc" }];
            case "subscriber_count_asc":
              return [{ created_at: "asc" }];
            case "subscriber_count_desc":
              return [{ created_at: "desc" }];
            case "created_at_asc":
              return [{ created_at: "asc" }];
            case "created_at_desc":
              return [{ created_at: "desc" }];
            default:
              return [{ created_at: "desc" }];
          }
        })()
      : [{ created_at: "desc" }];
  const records = await MyGlobal.prisma.reddit_community_communities.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    ...RedditCommunityCommunityAtSummaryTransformer.select(),
  });
  const subscriberCountMin: number = props.body.subscriber_count_min ?? 0;
  const filteredRecords = records.filter(
    (record) => record._count.subscriptions >= subscriberCountMin,
  );
  const transformedData = await ArrayUtil.asyncMap(
    filteredRecords,
    RedditCommunityCommunityAtSummaryTransformer.transform,
  );
  const total: number & tags.Type<"int32"> & tags.Minimum<0> =
    filteredRecords.length;
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> = Math.ceil(
    total / limit,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: transformedData,
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
// export async function patchRedditCommunityGuestCommunities(props: {
//   guest: GuestPayload;
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