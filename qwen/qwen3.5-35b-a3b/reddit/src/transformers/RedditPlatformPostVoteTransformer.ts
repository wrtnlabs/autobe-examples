import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformPostVoteTransformer {
  export type Payload = Prisma.reddit_platform_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        post: RedditPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostVote> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditPlatformPostVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostVoteTransformer {
//       export type Payload = Prisma.reddit_platform_post_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             vote_type: true,
//             created_at: true,
//             updated_at: true,
//             member: RedditPlatformMemberAtSummaryTransformer.select(),
//             post: RedditPlatformPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostVote> {
//         return {
//   id: {string},
//   vote_type: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   author: await RedditPlatformMemberAtSummaryTransformer.transform(input.member),
//   post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------