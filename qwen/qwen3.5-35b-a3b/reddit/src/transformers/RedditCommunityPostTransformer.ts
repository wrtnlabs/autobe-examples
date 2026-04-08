import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityPostTransformer {
  export type Payload = Prisma.reddit_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        link_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        vote_score: true,
        comment_count: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        snapshots: true,
        files: true,
        votes: true,
        comments: true,
        redditCommunityPostReports: true,
        redditPostReports: true,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_content: input.text_content ?? null,
      link_url: input.link_url ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCommunityPost;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityPostTransformer {
//       export type Payload = Prisma.reddit_community_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             post_type: true,
//             text_content: true,
//             link_url: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             vote_score: true,
//             comment_count: true,
//             author: RedditCommunityMemberAtSummaryTransformer.select(),
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityPost> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {string},
//   text_content: {string | null},
//   link_url: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   vote_score: {integer},
//   comment_count: {integer},
//   author: await RedditCommunityMemberAtSummaryTransformer.transform(input.author),
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------