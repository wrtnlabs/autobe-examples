import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberSearchPosts(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.ISearchRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id !== undefined &&
    props.body.community_id !== null
      ? { community_id: props.body.community_id }
      : {}),
    ...(props.body.author_id !== undefined && props.body.author_id !== null
      ? { author_id: props.body.author_id }
      : {}),
    ...(props.body.post_type !== undefined && props.body.post_type !== null
      ? { post_type: props.body.post_type }
      : {}),
    ...(props.body.exclude_ids !== undefined &&
    props.body.exclude_ids.length > 0
      ? { id: { notIn: props.body.exclude_ids } }
      : {}),
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
      ? {
          title: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  const orderBy: Prisma.reddit_platform_postsOrderByWithRelationInput =
    props.body.sort === "hot"
      ? { upvotes_count: "desc", created_at: "desc" }
      : props.body.sort === "new"
        ? { created_at: "desc" }
        : props.body.sort === "top"
          ? { upvotes_count: "desc" }
          : props.body.sort === "controversial"
            ? { upvotes_count: "asc" }
            : { created_at: "desc" };
  const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
    ...RedditPlatformPostAtSummaryTransformer.select(),
    where: whereInput,
    orderBy,
    skip,
    take: limit,
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
      RedditPlatformPostAtSummaryTransformer.transform,
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
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberSearchPosts(props: {
//   member: MemberPayload;
//   body: IRedditPlatformPost.ISearchRequest;
// }): Promise<IPageIRedditPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
//     ...RedditPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------