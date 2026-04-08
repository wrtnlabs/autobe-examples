import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformReviewSnapshotTransformer {
  export type Payload = Prisma.mall_platform_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformReviewSnapshot> {
    return {
      id: input.id,
      mall_platform_review_id: input.mall_platform_review_id,
      mall_platform_customer_id: input.mall_platform_customer_id,
      snapshot_action: input.snapshot_action,
      rating: input.rating,
      content: input.content,
      is_deleted: input.is_deleted,
      created_at: input.created_at.toISOString(),
    } satisfies IMallPlatformReviewSnapshot;
  }
  export function select() {
    return {
      select: {
        id: true,
        mall_platform_review_id: true,
        mall_platform_customer_id: true,
        snapshot_action: true,
        rating: true,
        content: true,
        is_deleted: true,
        created_at: true,
      },
    } satisfies Prisma.mall_platform_review_snapshotsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformReviewSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_action: true,
//             rating: true,
//             content: true,
//             is_deleted: true,
//             created_at: true,
//             mall_platform_review_id: true,
//             mall_platform_customer_id: true,
//           },
//         } satisfies Prisma.mall_platform_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformReviewSnapshot> {
//         return {
//   id: {string},
//   mall_platform_review_id: {string},
//   mall_platform_customer_id: {string},
//   snapshot_action: {string},
//   rating: {integer},
//   content: {string | null},
//   is_deleted: {boolean},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------