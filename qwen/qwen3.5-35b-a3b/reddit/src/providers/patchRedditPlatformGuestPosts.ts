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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestPosts(props: {
  guest: GuestPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.author_id !== undefined && {
      author_id: props.body.author_id,
    }),
    ...(props.body.post_type !== undefined && {
      post_type: props.body.post_type,
    }),
    ...(props.body.title_search !== undefined && {
      title: {
        contains: props.body.title_search,
        mode: "insensitive",
      },
    }),
    ...(props.body.startDate !== undefined && {
      created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput =
    props.body.sort === "hot"
      ? { upvotes_count: "desc", created_at: "desc" }
      : props.body.sort === "new"
        ? { created_at: "desc" }
        : props.body.sort === "top"
          ? { upvotes_count: "desc" }
          : { upvotes_count: "asc", created_at: "asc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_posts.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformPost.ISummary;
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
// export async function patchRedditPlatformGuestPosts(props: {
//   guest: GuestPayload;
//   body: IRedditPlatformPost.IRequest;
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