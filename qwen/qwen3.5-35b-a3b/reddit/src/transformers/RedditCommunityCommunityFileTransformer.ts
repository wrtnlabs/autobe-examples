import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";

export namespace RedditCommunityCommunityFileTransformer {
  export type Payload = Prisma.reddit_community_community_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_path: true,
        filename: true,
        mime_type: true,
        file_size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        communitySnapshots: true,
      },
    } satisfies Prisma.reddit_community_community_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunityFile> {
    return {
      id: input.id,
      file_path: input.file_path,
      filename: input.filename,
      mime_type: input.mime_type,
      file_size: Number(input.file_size),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      community_id: input.community.id,
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    } satisfies IRedditCommunityCommunityFile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityCommunityFileTransformer {
//       export type Payload = Prisma.reddit_community_community_filesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             file_path: true,
//             filename: true,
//             mime_type: true,
//             file_size: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             community: RedditCommunityCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_community_community_filesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityCommunityFile> {
//         return {
//   id: {string},
//   file_path: {string},
//   filename: {string},
//   mime_type: {string},
//   file_size: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   community_id: {string},
//   community: await RedditCommunityCommunityAtSummaryTransformer.transform(input.community),
//         };
//       }
//     }
//--------------------------------------------------------------