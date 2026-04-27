import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";

export namespace CommunityPlatformCommunityImageTransformer {
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
        updated_at: true,
        deleted_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityImage> {
    return {
      id: input.id,
      name: input.name,
      mime_type: input.mime_type,
      size: input.size,
      url: input.url,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityPlatformCommunityImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityImageTransformer {
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
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_community_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunityImage> {
//         return {
//   id: {string},
//   name: {string},
//   mime_type: {string},
//   size: {integer},
//   url: {string},
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------