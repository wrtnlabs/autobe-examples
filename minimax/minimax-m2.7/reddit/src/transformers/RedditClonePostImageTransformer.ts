import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileTransformer } from "./RedditCloneFileTransformer";

export namespace RedditClonePostImageTransformer {
  export type Payload = Prisma.reddit_clone_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        post: true,
        file: RedditCloneFileTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditClonePostImage> {
    return {
      id: input.id,
      file: await RedditCloneFileTransformer.transform(input.file),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IRedditClonePostImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostImageTransformer {
//       export type Payload = Prisma.reddit_clone_post_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             reddit_clone_post_id: true,
//             reddit_clone_file_id: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_post_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePostImage> {
//         return {
//   id: {string},
//   file: {IRedditCloneFile},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------