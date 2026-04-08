import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityPostFileTransformer {
  export type Payload = Prisma.reddit_community_post_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        file_type: true,
        file_size: true,
        file_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostFile> {
    return {
      id: input.id,
      file_name: input.file_name,
      file_type: input.file_type,
      file_size: input.file_size,
      file_url: input.file_url,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditCommunityPostFile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityPostFileTransformer {
//       export type Payload = Prisma.reddit_community_post_filesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             file_name: true,
//             file_type: true,
//             file_size: true,
//             file_url: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: RedditCommunityPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_post_filesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityPostFile> {
//         return {
//   id: {string},
//   file_name: {string},
//   file_type: {string},
//   file_size: {integer},
//   file_url: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------