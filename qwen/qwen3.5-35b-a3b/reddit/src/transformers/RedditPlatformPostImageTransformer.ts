import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformPostImageTransformer {
  export type Payload = Prisma.reddit_platform_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        image_alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reddit_platform_post_id: true,
        post: true,
      },
    } satisfies Prisma.reddit_platform_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformPostImage> {
    return {
      id: input.id,
      image_url: input.image_url,
      image_alt_text: input.image_alt_text ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      reddit_platform_post_id: input.reddit_platform_post_id,
    } satisfies IRedditPlatformPostImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditPlatformPostImageTransformer {
//       export type Payload = Prisma.reddit_platform_post_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             image_alt_text: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reddit_platform_post_id: true,
//           },
//         } satisfies Prisma.reddit_platform_post_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditPlatformPostImage> {
//         return {
//   id: {string},
//   image_url: {string},
//   image_alt_text: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   reddit_platform_post_id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------