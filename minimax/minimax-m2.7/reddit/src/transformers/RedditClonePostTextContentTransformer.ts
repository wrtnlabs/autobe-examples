import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditClonePostTextContentTransformer {
  export type Payload = Prisma.reddit_clone_post_text_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            author: RedditCloneMemberAtSummaryTransformer.select(),
            community: RedditCloneCommunityAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.reddit_clone_post_text_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostTextContent> {
    return {
      id: input.id,
      body: input.body,
      post: {
        id: input.post.id,
        title: input.post.title,
        type: input.post.type as "text" | "link" | "image",
        voteScore: input.post.vote_score as number,
        commentCount: input.post.comment_count as number,
        createdAt: input.post.created_at.toISOString(),
        author: await RedditCloneMemberAtSummaryTransformer.transform(
          input.post.author,
        ),
        community: await RedditCloneCommunityAtSummaryTransformer.transform(
          input.post.community,
        ),
        contentPreview: "",
      } satisfies IRedditClonePost.ISummary,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostTextContentTransformer {
//       export type Payload = Prisma.reddit_clone_post_text_contentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             body: true,
//             post: RedditClonePostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_post_text_contentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostTextContent> {
//         return {
//   id: {string},
//   body: {string},
//   post: await RedditClonePostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------