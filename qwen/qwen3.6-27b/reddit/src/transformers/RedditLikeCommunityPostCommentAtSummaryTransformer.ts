import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "./REdditLikeCommunityMemberAtSummaryTransformer";

export namespace RedditLikeCommunityPostCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_post_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        authorMember: REdditLikeCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_post_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityPostComment.ISummary> {
    return {
      id: input.id,
      author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(
        input.authorMember,
      ),
      body: input.body,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostCommentAtSummaryTransformer {
//       export type Payload = Prisma.reddit_like_community_post_commentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             deleted_at: true,
//             body: true,
//             updated_at: true,
//             reddit_like_community_post_comment_id: true,
//             authorMember: REdditLikeCommunityMemberAtSummaryTransformer.select(),
//             reddit_like_community_post_id: true,
//           },
//         } satisfies Prisma.reddit_like_community_post_commentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityPostComment.ISummary> {
//         return {
//   id: {string},
//   author: await REdditLikeCommunityMemberAtSummaryTransformer.transform(input.authorMember),
//   body: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------