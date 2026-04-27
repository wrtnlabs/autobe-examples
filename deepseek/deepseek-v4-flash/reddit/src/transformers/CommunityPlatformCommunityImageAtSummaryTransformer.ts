import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunityImageAtSummaryTransformer {
  export type Payload = Prisma.community_platform_community_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        mime_type: true,
        size: true,
        url: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_community_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityImage.ISummary> {
    return {
      id: input.id,
      name: input.name,
      mime_type: input.mime_type,
      size: input.size,
      url: input.url,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityPlatformCommunityImage.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityImageAtSummaryTransformer {
//       export type Payload = Prisma.community_platform_community_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             mime_type: true,
//             size: true,
//             url: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             community_platform_community_id: true,
//           },
//         } satisfies Prisma.community_platform_community_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunityImage.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   mime_type: {string},
//   size: {integer},
//   url: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------