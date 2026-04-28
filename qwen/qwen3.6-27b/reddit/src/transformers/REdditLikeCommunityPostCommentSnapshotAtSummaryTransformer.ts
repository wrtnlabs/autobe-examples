import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPostCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityCommentAtSummaryTransformer } from "./REdditLikeCommunityCommentAtSummaryTransformer";

export namespace REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_like_community_post_comment_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        comment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
        parentComment: REdditLikeCommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_post_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityPostCommentSnapshot.ISummary> {
    return {
      id: input.id,
      comment: await REdditLikeCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      parentComment: input.parentComment
        ? await REdditLikeCommunityCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      body: input.body,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityPostCommentSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_post_comment_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             body: true,
//             created_at: true,
//             comment_id: true,
//             parent_comment_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_like_community_post_comment_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityPostCommentSnapshot.ISummary> {
//         return {
//   id: {string},
//   comment: {IREdditLikeCommunityComment.ISummary},
//   parentComment: {IREdditLikeCommunityComment.ISummary | null},
//   body: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------