import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityPostCommentSnapshot";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPostCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer } from "../transformers/REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityGuestPostsPostIdCommentsCommentIdSnapshots(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityPostCommentSnapshot.IRequest;
}): Promise<IPageIREdditLikeCommunityPostCommentSnapshot.ISummary> {
  await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
    select: { id: true },
  });
  await MyGlobal.prisma.reddit_like_community_post_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      reddit_like_community_post_id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_like_community_post_comment_snapshotsWhereInput =
    {
      comment_id: props.commentId,
      ...(props.body.dateRangeMin !== undefined ||
      props.body.dateRangeMax !== undefined
        ? {
            created_at: {
              ...(props.body.dateRangeMin !== undefined && {
                gte: props.body.dateRangeMin,
              }),
              ...(props.body.dateRangeMax !== undefined && {
                lte: props.body.dateRangeMax,
              }),
            } satisfies Prisma.DateTimeFilter,
          }
        : {}),
    };
  const records =
    await MyGlobal.prisma.reddit_like_community_post_comment_snapshots.findMany(
      {
        where: whereInput,
        skip: skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.reddit_like_community_post_comment_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer.transform,
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
// import { IREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPostCommentSnapshot";
// import { IPageIREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityPostCommentSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityGuestPostsPostIdCommentsCommentIdSnapshots(props: {
//   guest: GuestPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityPostCommentSnapshot.IRequest;
// }): Promise<IPageIREdditLikeCommunityPostCommentSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_like_community_post_comment_snapshots.findMany({
//     ...REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------