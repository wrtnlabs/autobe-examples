import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostSnapshot";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityPostSnapshotAtSummaryTransformer } from "../transformers/RedditLikeCommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditLikeCommunityPostSnapshot.ISummary> {
  // Verify the post exists (404 if not found)
  await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Parse sort parameter (default: created_at ascending for chronological order)
  const sortValue = props.body.sort ?? "created_at:asc";
  const [_field, direction] = sortValue.split(":");
  const sortOrder: "asc" | "desc" =
    direction?.includes("desc") === true ? "desc" : "asc";
  // Query post snapshots filtered by postId
  const records =
    await MyGlobal.prisma.reddit_like_community_post_snapshots.findMany({
      where: { reddit_like_community_post_id: props.postId },
      skip,
      take: limit,
      orderBy: { created_at: sortOrder },
      ...RedditLikeCommunityPostSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total =
    await MyGlobal.prisma.reddit_like_community_post_snapshots.count({
      where: { reddit_like_community_post_id: props.postId },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeCommunityPostSnapshotAtSummaryTransformer.transform,
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
// import { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
// import { IPageIRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityPostsPostIdSnapshots(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityPostSnapshot.IRequest;
// }): Promise<IPageIRedditLikeCommunityPostSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_like_community_post_snapshots.findMany({
//     ...RedditLikeCommunityPostSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditLikeCommunityPostSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------