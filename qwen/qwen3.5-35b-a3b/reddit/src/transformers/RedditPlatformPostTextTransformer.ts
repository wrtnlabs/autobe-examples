import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformPostTextTransformer {
  export type Payload = Prisma.reddit_platform_post_textsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        text_content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_post_textsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostText> {
    return {
      id: input.id,
      reddit_platform_post_id: input.post.id,
      text_content: input.text_content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditPlatformPostText;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostTextTransformer {
//       export type Payload = Prisma.reddit_platform_post_textsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             text_content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: RedditPlatformPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_post_textsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostText> {
//         return {
//   id: {string},
//   reddit_platform_post_id: {string},
//   text_content: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------