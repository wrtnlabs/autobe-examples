import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityPostVoteTransformer {
  export type Payload = Prisma.reddit_community_post_votesGetPayload<
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
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        post: RedditCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostVote> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditCommunityPostVote;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityPostVoteTransformer {
//       export type Payload = Prisma.reddit_community_post_votesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             vote_type: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: RedditCommunityPostAtSummaryTransformer.select(),
//             member: RedditCommunityMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_post_votesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityPostVote> {
//         return {
//   id: {string},
//   vote_type: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   author: await RedditCommunityMemberAtSummaryTransformer.transform(input.member),
//   post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------