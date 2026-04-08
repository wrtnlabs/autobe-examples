import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditClonePostTextContentTransformer {
  export type Payload = Prisma.reddit_clone_post_text_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        post: RedditClonePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_text_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostTextContent> {
    return {
      id: input.id,
      body: input.body,
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditClonePostTextContent;
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