import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";

export namespace RedditPlatformPostLinkTransformer {
  export type Payload = Prisma.reddit_platform_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_post_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostLink> {
    return {
      id: input.id,
      url: input.url,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditPlatformPostLink;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostLinkTransformer {
//       export type Payload = Prisma.reddit_platform_post_linksGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             url: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: RedditPlatformPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_platform_post_linksFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostLink> {
//         return {
//   id: {string},
//   url: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   post: await RedditPlatformPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------