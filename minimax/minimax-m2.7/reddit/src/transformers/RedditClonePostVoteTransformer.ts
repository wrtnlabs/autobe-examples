import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditClonePostVoteTransformer {
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
        post: RedditClonePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostVote> {
    return {
      id: input.id,
      direction: input.direction,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditClonePostVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostVoteTransformer {
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
//             post: RedditClonePostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostVote> {
//         return {
//   id: {string},
//   direction: {string},
//   created_at: {string},
//   updated_at: {string},
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   post: await RedditClonePostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------