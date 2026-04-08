import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVoteStatus";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommentVoteStatusTransformer {
  export type Payload = Prisma.reddit_platform_comment_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_platform_membersFindManyArgs,
        comment: {
          select: {
            id: true,
            reddit_platform_member_id: true,
            reddit_platform_comments_id: true,
            reddit_platform_post_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_comment_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentVoteStatus> {
    return {
      voteType: input.vote_type,
    } satisfies IRedditPlatformCommentVoteStatus;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformCommentVoteStatusTransformer {
//       export type Payload = Prisma.reddit_platform_comment_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             voteType: true,
//           },
//         } satisfies Prisma.reddit_platform_comment_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformCommentVoteStatus> {
//         return {
//   voteType: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------