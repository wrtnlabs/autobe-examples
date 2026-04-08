import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditClonePostVoteAtSummaryTransformer {
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
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostVote.ISummary> {
    return {
      id: input.id,
      direction: input.direction,
      createdAt: input.created_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      updatedAt: input.updated_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostVoteAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_post_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             direction: true,
//             created_at: true,
//             updated_at: true,
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//             reddit_clone_post_id: true,
//           },
//         } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostVote.ISummary> {
//         return {
//   id: {string},
//   direction: {string},
//   createdAt: {string},
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   updatedAt: {null | string},
//         };
//       }
//     }
//--------------------------------------------------------------