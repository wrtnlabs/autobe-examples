import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditClonePostLinkTransformer {
  export type Payload = Prisma.reddit_clone_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        created_at: true,
        updated_at: true,
        post: RedditClonePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostLink> {
    return {
      id: input.id,
      url: input.url,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditClonePostLink;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostLinkTransformer {
//       export type Payload = Prisma.reddit_clone_post_linksGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             url: true,
//             created_at: true,
//             updated_at: true,
//             post: RedditClonePostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_post_linksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostLink> {
//         return {
//   id: {string},
//   url: {string},
//   created_at: {string},
//   updated_at: {string},
//   post: await RedditClonePostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------