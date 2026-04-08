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

export namespace RedditCommunityPostAtSummaryTransformer {
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
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: typia.assert<"text" | "link" | "image">(input.post_type),
      text_content: input.text_content ?? null,
      link_url: input.link_url ?? null,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCommunityPost.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityPostAtSummaryTransformer {
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
//             vote_score: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.reddit_community_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityPost.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   post_type: {"text" | "link" | "image"},
//   text_content: {string | null},
//   link_url: {string | null},
//   vote_score: {integer},
//   comment_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   author: {IRedditCommunityMember.ISummary},
//   community: {IRedditCommunityCommunity.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------