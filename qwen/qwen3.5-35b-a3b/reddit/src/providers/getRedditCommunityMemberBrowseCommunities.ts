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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberBrowseCommunities(props: {
  member: MemberPayload;
  query?: {
    page?: number & tags.Type<"int32"> & tags.Minimum<0>;
    page_size?: number & tags.Type<"int32"> & tags.Minimum<0>;
    cursor?: (string & tags.Format<"uuid">) | null;
  };
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.query?.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    props.query?.page_size ?? 20;
  const cursor: (string & tags.Format<"uuid">) | null =
    props.query?.cursor ?? null;
  if (limit > 100) {
    throw new HttpException("page_size must be at most 100", 400);
  }
  if (page < 1) {
    throw new HttpException("page must be at least 1", 400);
  }
  if (cursor !== null && cursor !== undefined) {
    try {
      typia.assert<string & tags.Format<"uuid">>(cursor);
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  const whereInput: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
  };
  if (cursor !== null && cursor !== undefined) {
    whereInput.id = {
      gt: cursor,
    };
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where: whereInput,
      take: limit,
      orderBy: { id: "asc" },
      ...RedditCommunityCommunityAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_communities.count({
      where: whereInput,
    }),
  ]);
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> =
    total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityCommunityAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityCommunity.ISummary;
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
// import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberBrowseCommunities(props: {
//   member: MemberPayload;
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