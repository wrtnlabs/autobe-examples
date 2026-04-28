import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityPostAtSummaryTransformer } from "../transformers/REdditLikeCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityPosts(props: {
  body: IREdditLikeCommunityPost.IRequest;
}): Promise<IPageIRedditLikeCommunityPost.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 50, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(body.author_id && { author_id: body.author_id }),
    ...(body.community_id && { community_id: body.community_id }),
    ...(body.post_type && { post_type: body.post_type }),
    ...(body.search && { title: { contains: body.search } }),
    ...(body.time_filter === "today" && {
      created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    ...(body.time_filter === "this_week" && {
      created_at: {
        gte: (() => {
          const d = new Date();
          d.setDate(d.getDate() - d.getDay());
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
      },
    }),
    ...(body.time_filter === "this_month" && {
      created_at: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
  } satisfies Prisma.reddit_like_community_postsWhereInput;
  const orderByInput =
    body.sort_by === "new"
      ? { created_at: "desc" as const }
      : body.sort_by === "top"
        ? { created_at: "desc" as const }
        : body.sort_by === "hot"
          ? { created_at: "desc" as const }
          : body.sort_by === "controversial"
            ? { created_at: "desc" as const }
            : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.reddit_like_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...REdditLikeCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      REdditLikeCommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityPosts(props: {
//   body: IREdditLikeCommunityPost.IRequest;
// }): Promise<IPageIRedditLikeCommunityPost.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityPostAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------