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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityCommentAtSummaryTransformer } from "../transformers/REdditLikeCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityComment.IRequest;
}): Promise<IPageIRedditLikeCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "new";
  await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const whereInput = {
    post_id: props.postId,
    deleted_at: null,
  } satisfies Prisma.reddit_like_community_commentsWhereInput;
  if (sort === "new") {
    const data = await MyGlobal.prisma.reddit_like_community_comments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...REdditLikeCommunityCommentAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.reddit_like_community_comments.count({
      where: whereInput,
    });
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        data,
        REdditLikeCommunityCommentAtSummaryTransformer.transform,
      ),
    };
  }
  const comments =
    await MyGlobal.prisma.reddit_like_community_comments.findMany({
      where: whereInput,
      select: {
        id: true,
        created_at: true,
        votes: {
          select: { direction: true },
        },
      },
    });
  const scored = comments.map((c) => {
    const upvotes = c.votes.filter((v) => v.direction === "upvote").length;
    const downvotes = c.votes.filter((v) => v.direction === "downvote").length;
    return {
      id: c.id,
      voteScore: upvotes - downvotes,
      controversialScore: Math.min(upvotes, downvotes),
      createdAt: c.created_at.getTime(),
    };
  });
  if (sort === "best") {
    scored.sort((a, b) =>
      b.voteScore !== a.voteScore
        ? b.voteScore - a.voteScore
        : b.createdAt - a.createdAt,
    );
  } else {
    scored.sort((a, b) =>
      b.controversialScore !== a.controversialScore
        ? b.controversialScore - a.controversialScore
        : b.createdAt - a.createdAt,
    );
  }
  const total = scored.length;
  const pagedIds = scored.slice(skip, skip + limit).map((s) => s.id);
  let transformedComments: IREdditLikeCommunityComment.ISummary[] = [];
  if (pagedIds.length > 0) {
    const data = await MyGlobal.prisma.reddit_like_community_comments.findMany({
      where: { id: { in: pagedIds } },
      ...REdditLikeCommunityCommentAtSummaryTransformer.select(),
    });
    const orderIndex = new Map(pagedIds.map((id, i) => [id, i]));
    const ordered = data.sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    );
    transformedComments = await ArrayUtil.asyncMap(
      ordered,
      REdditLikeCommunityCommentAtSummaryTransformer.transform,
    );
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedComments,
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
// export async function patchRedditLikeCommunityMemberPostsPostIdComments(props: {
//   member: MemberPayload;
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