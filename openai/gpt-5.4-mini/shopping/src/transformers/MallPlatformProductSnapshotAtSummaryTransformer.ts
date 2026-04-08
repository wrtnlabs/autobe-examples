import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";

export namespace MallPlatformProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_kind: true,
        product_name: true,
        product_description: true,
        category_name: true,
        base_price: true,
        main_image_uri: true,
        image_count: true,
        variant_count: true,
        created_at: true,
        product: MallPlatformProductAtSummaryTransformer.select(),
        variants: { select: {} },
        images: { select: {} },
      },
    } satisfies Prisma.mall_platform_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductSnapshot.ISummary> {
    return {
      id: input.id,
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      snapshotKind: input.snapshot_kind,
      productName: input.product_name,
      productDescription: input.product_description,
      categoryName: input.category_name ?? null,
      basePrice: input.base_price,
      mainImageUri: input.main_image_uri ?? null,
      imageCount: input.image_count,
      variantCount: input.variant_count,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformProductSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_product_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_kind: true,
//             product_name: true,
//             product_description: true,
//             category_name: true,
//             base_price: true,
//             main_image_uri: true,
//             image_count: true,
//             variant_count: true,
//             created_at: true,
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductSnapshot.ISummary> {
//         return {
//   id: {string},
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   snapshotKind: {string},
//   productName: {string},
//   productDescription: {string},
//   categoryName: {string | null},
//   basePrice: {number},
//   mainImageUri: {string | null},
//   imageCount: {integer},
//   variantCount: {integer},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------