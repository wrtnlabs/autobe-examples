import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditClonePostVoteAtUpsertTransformer {
  export type Payload = Prisma.reddit_clone_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
            comments: {
              select: {
                vote_score: true,
              },
            },
          },
        },
      } satisfies Prisma.reddit_clone_post_votesSelect,
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostVote.IUpsert> {
    return {
      id: input.id,
      direction: input.direction,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      commentVoteScore: input.post.comments.reduce(
        (sum, c) => sum + c.vote_score,
        0,
      ),
    } satisfies IRedditClonePostVote.IUpsert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostVoteAtUpsertTransformer {
//       export type Payload = Prisma.reddit_clone_post_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             direction: true,
//             createdAt: true,
//             updatedAt: true,
//             commentVoteScore: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostVote.IUpsert> {
//         return {
//   id: {string},
//   direction: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   member: {IRedditCloneMember.ISummary},
//   commentVoteScore: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------