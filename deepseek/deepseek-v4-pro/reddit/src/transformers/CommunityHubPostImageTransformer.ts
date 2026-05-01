import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubPostAtSummaryTransformer } from "./CommunityHubPostAtSummaryTransformer";

export namespace CommunityHubPostImageTransformer {
  export type Payload = Prisma.community_hub_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_path: true,
        thumbnail_path: true,
        byte_size: true,
        width: true,
        height: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: CommunityHubPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_hub_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubPostImage> {
    return {
      id: input.id,
      original_path: input.original_path,
      thumbnail_path: input.thumbnail_path,
      byte_size: input.byte_size,
      width: input.width,
      height: input.height,
      mime_type: input.mime_type,
      post: await CommunityHubPostAtSummaryTransformer.transform(input.post),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityHubPostImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubPostImageTransformer {
//       export type Payload = Prisma.community_hub_post_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             original_path: true,
//             thumbnail_path: true,
//             byte_size: true,
//             width: true,
//             height: true,
//             mime_type: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             post: CommunityHubPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_hub_post_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubPostImage> {
//         return {
//   id: {string},
//   original_path: {string},
//   thumbnail_path: {string},
//   byte_size: {integer},
//   width: {integer},
//   height: {integer},
//   mime_type: {string},
//   post: await CommunityHubPostAtSummaryTransformer.transform(input.post),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------