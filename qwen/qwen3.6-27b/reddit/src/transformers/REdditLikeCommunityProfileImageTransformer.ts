import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { REdditLikeCommunityProfileAtSummaryTransformer } from "./REdditLikeCommunityProfileAtSummaryTransformer";

export namespace REdditLikeCommunityProfileImageTransformer {
  export type Payload = Prisma.reddit_like_community_profile_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_key: true,
        content_type: true,
        file_size: true,
        width: true,
        height: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        profile: REdditLikeCommunityProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_profile_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IREdditLikeCommunityProfileImage> {
    return {
      id: input.id,
      file_key: input.file_key,
      content_type: input.content_type,
      file_size: input.file_size,
      width: input.width,
      height: input.height,
      is_active: input.is_active,
      profile: await REdditLikeCommunityProfileAtSummaryTransformer.transform(
        input.profile,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace REdditLikeCommunityProfileImageTransformer {
//       export type Payload = Prisma.reddit_like_community_profile_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             file_key: true,
//             content_type: true,
//             file_size: true,
//             width: true,
//             height: true,
//             is_active: true,
//             created_at: true,
//             updated_at: true,
//             profile: REdditLikeCommunityProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_like_community_profile_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IREdditLikeCommunityProfileImage> {
//         return {
//   id: {string},
//   file_key: {string},
//   content_type: {string},
//   file_size: {integer},
//   width: {integer},
//   height: {integer},
//   is_active: {boolean},
//   profile: await REdditLikeCommunityProfileAtSummaryTransformer.transform(input.profile),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------