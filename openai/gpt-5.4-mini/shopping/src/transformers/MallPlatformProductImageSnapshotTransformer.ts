import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";

export namespace MallPlatformProductImageSnapshotTransformer {
  export type Payload = Prisma.mall_platform_product_image_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductImageSnapshot> {
    return {
      id: input.id,
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      imageUrl: input.image_url,
      imageOrder: input.image_order,
      isMain: input.is_main,
      changedAt: input.changed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformProductImageSnapshot;
  }
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        image_order: true,
        is_main: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: MallPlatformProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_product_image_snapshotsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductImageSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_product_image_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_url: true,
//             image_order: true,
//             is_main: true,
//             changed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_image_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductImageSnapshot> {
//         return {
//   id: {string},
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   imageUrl: {string},
//   imageOrder: {integer},
//   isMain: {boolean},
//   changedAt: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------