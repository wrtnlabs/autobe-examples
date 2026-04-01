import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderItemAtSummaryTransformer } from "./MallPlatformOrderItemAtSummaryTransformer";

export namespace MallPlatformOrderItemSnapshotTransformer {
  export type Payload = Prisma.mall_platform_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrderItemSnapshot> {
    return {
      id: input.id,
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
      unitPrice: input.unit_price,
      quantity: input.quantity,
      lineTotal: input.line_total,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
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
        variantOptions: { select: {} },
      },
    } satisfies Prisma.mall_platform_order_item_snapshotsFindManyArgs;
  }
}
