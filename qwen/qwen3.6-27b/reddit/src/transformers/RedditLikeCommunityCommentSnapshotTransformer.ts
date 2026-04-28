import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommentAtSummaryTransformer } from "./REdditLikeCommunityCommentAtSummaryTransformer";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";
import { REdditLikeCommunityPostAtSummaryTransformer } from "./REdditLikeCommunityPostAtSummaryTransformer";

export namespace RedditLikeCommunityCommentSnapshotTransformer {
  export type Payload =
    Prisma.reddit_like_community_comment_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        comment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
        post: REdditLikeCommunityPostAtSummaryTransformer.select(),
        parentComment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
        member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityCommentSnapshot> {
    return {
      id: input.id,
      commentId: input.comment.id,
      postId: input.post.id,
      parentCommentId: input.parentComment?.id ?? null,
      memberId: input.member.id,
      comment: await REdditLikeCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      post: await REdditLikeCommunityPostAtSummaryTransformer.transform(
        input.post,
      ),
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      parentComment:
        input.parentComment == null
          ? null
          : await REdditLikeCommunityCommentAtSummaryTransformer.transform(
              input.parentComment,
            ),
      body: input.body,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditLikeCommunityCommentSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityCommentSnapshotTransformer {
//       export type Payload = Prisma.reddit_like_community_comment_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             body: true,
//             created_at: true,
//             reddit_like_community_comment_id: true,
//             post: REdditLikeCommunityPostAtSummaryTransformer.select(),
//             reddit_like_community_parent_comment_id: true,
//             member: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_comment_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityCommentSnapshot> {
//         return {
//   id: {string},
//   commentId: {string},
//   postId: {string},
//   parentCommentId: {string | null},
//   memberId: {string},
//   comment: {IREdditLikeCommunityComment.ISummary},
//   post: await REdditLikeCommunityPostAtSummaryTransformer.transform(input.post),
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.member),
//   parentComment: {IREdditLikeCommunityComment.ISummary | null},
//   body: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------