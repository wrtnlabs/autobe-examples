import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityPostAtSummaryTransformer } from "./REdditLikeCommunityPostAtSummaryTransformer";

export namespace RedditLikeCommunityPostImageTransformer {
  export type Payload = Prisma.reddit_like_community_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        filename: true,
        file_size_bytes: true,
        content_type: true,
        width: true,
        height: true,
        hash_sha256: true,
        created_at: true,
        updated_at: true,
        post: REdditLikeCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityPostImage> {
    return {
      id: input.id,
      image_url: input.image_url,
      filename: input.filename,
      file_size_bytes: input.file_size_bytes,
      content_type: input.content_type,
      width: input.width ?? null,
      height: input.height ?? null,
      hash_sha256: input.hash_sha256 ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      post: await REdditLikeCommunityPostAtSummaryTransformer.transform(
        input.post,
      ),
    } satisfies IRedditLikeCommunityPostImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditLikeCommunityPostImageTransformer {
//       export type Payload = Prisma.reddit_like_community_post_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             filename: true,
//             file_size_bytes: true,
//             content_type: true,
//             width: true,
//             height: true,
//             hash_sha256: true,
//             created_at: true,
//             updated_at: true,
//             post: REdditLikeCommunityPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_post_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditLikeCommunityPostImage> {
//         return {
//   id: {string},
//   image_url: {string},
//   filename: {string},
//   file_size_bytes: {integer},
//   content_type: {string},
//   width: {integer | null},
//   height: {integer | null},
//   hash_sha256: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   post: await REdditLikeCommunityPostAtSummaryTransformer.transform(input.post),
//         };
//       }
//     }
//--------------------------------------------------------------