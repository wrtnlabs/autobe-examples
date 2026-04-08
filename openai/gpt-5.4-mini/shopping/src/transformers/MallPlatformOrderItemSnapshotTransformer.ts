import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderItemAtSummaryTransformer } from "./MallPlatformOrderItemAtSummaryTransformer";
import { MallPlatformOrderItemSnapshotVariantOptionTransformer } from "./MallPlatformOrderItemSnapshotVariantOptionTransformer";

export namespace MallPlatformOrderItemSnapshotTransformer {
  export type Payload = Prisma.mall_platform_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrderItemSnapshot> {
    return {
      id: input.id,
      mallPlatformOrderItemId: input.mall_platform_order_item_id,
      orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      snapshotAt: input.snapshot_at.toISOString(),
      snapshotReason: input.snapshot_reason,
      orderItemStatus: input.order_item_status,
      productName: input.product_name,
      productDescription: input.product_description,
      productSku: input.product_sku,
      variantSkuCode: input.variant_sku_code,
      sellerShopName: input.seller_shop_name,
      sellerShopDescription: input.seller_shop_description,
      sellerLogoImageUrl: input.seller_logo_image_url,
      unitPrice: Number(input.unit_price),
      quantity: input.quantity,
      lineTotal: Number(input.line_total),
      variantOptions: await ArrayUtil.asyncMap(
        input.variantOptions,
        MallPlatformOrderItemSnapshotVariantOptionTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformOrderItemSnapshot;
  }
  export function select() {
    return {
      select: {
        id: true,
        mall_platform_order_item_id: true,
        snapshot_at: true,
        snapshot_reason: true,
        order_item_status: true,
        product_name: true,
        product_description: true,
        product_sku: true,
        variant_sku_code: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_logo_image_url: true,
        unit_price: true,
        quantity: true,
        line_total: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
        variantOptions:
          MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
      },
    } satisfies Prisma.mall_platform_order_item_snapshotsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformOrderItemSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_order_item_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             snapshot_at: true,
//             snapshot_reason: true,
//             order_item_status: true,
//             product_name: true,
//             product_description: true,
//             product_sku: true,
//             variant_sku_code: true,
//             seller_shop_name: true,
//             seller_shop_description: true,
//             seller_logo_image_url: true,
//             unit_price: true,
//             quantity: true,
//             line_total: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             orderItem: MallPlatformOrderItemAtSummaryTransformer.select(),
//             variantOptions: MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_order_item_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformOrderItemSnapshot> {
//         return {
//   id: {string},
//   mallPlatformOrderItemId: {string},
//   orderItem: await MallPlatformOrderItemAtSummaryTransformer.transform(input.orderItem),
//   snapshotAt: {string},
//   snapshotReason: {string},
//   orderItemStatus: {string},
//   productName: {string},
//   productDescription: {string},
//   productSku: {string},
//   variantSkuCode: {string},
//   sellerShopName: {string},
//   sellerShopDescription: {string},
//   sellerLogoImageUrl: {string},
//   unitPrice: {number},
//   quantity: {integer},
//   lineTotal: {number},
//   variantOptions: await ArrayUtil.asyncMap(input.variantOptions, MallPlatformOrderItemSnapshotVariantOptionTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------