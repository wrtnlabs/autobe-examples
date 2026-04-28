import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityComment";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { REdditLikeCommunityCommentAtSummaryTransformer } from "../transformers/REdditLikeCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityGuestPostsPostIdComments(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityComment.IRequest;
}): Promise<IPageIRedditLikeCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const sort = props.body.sort ?? "new";
  await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const comments =
    await MyGlobal.prisma.reddit_like_community_comments.findMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      ...REdditLikeCommunityCommentAtSummaryTransformer.select(),
      ...(sort === "new" && { orderBy: { created_at: "desc" as const } }),
    });
  const computeVoteMetrics = (
    c: REdditLikeCommunityCommentAtSummaryTransformer.Payload,
  ) => {
    let upvotes = 0;
    let downvotes = 0;
    for (const v of c.votes) {
      if (v.direction === "upvote") upvotes++;
      else if (v.direction === "downvote") downvotes++;
    }
    const score = upvotes - downvotes;
    const totalVotes = upvotes + downvotes;
    const controversiality =
      totalVotes === 0 ? 0 : (2 * Math.min(upvotes, downvotes)) / totalVotes;
    return { comment: c, score, controversiality };
  };
  const total = comments.length;
  let scoredComments: ReturnType<typeof computeVoteMetrics>[];
  if (sort === "best") {
    scoredComments = comments
      .map(computeVoteMetrics)
      .sort((a, b) => b.score - a.score);
  } else if (sort === "controversial") {
    scoredComments = comments
      .map(computeVoteMetrics)
      .sort((a, b) => b.controversiality - a.controversiality);
  } else {
    scoredComments = comments.map(computeVoteMetrics);
  }
  const paged = scoredComments
    .slice((page - 1) * limit, page * limit)
    .map((item) => item.comment);
  return {
    data: await ArrayUtil.asyncMap(
      paged,
      REdditLikeCommunityCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
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
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// import { IPageIRedditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityGuestPostsPostIdComments(props: {
//   guest: GuestPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityComment.IRequest;
// }): Promise<IPageIRedditLikeCommunityComment.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityCommentAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------