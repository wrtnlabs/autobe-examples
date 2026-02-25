import { IEcommerceOrderItemPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemPurchaseSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceOrderItemPurchaseSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_order_item_purchase_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        product_base_price: true,
        variant_sku: true,
        variant_option_values: true,
        variant_price: true,
        seller_shop_name: true,
        seller_shop_description: true,
        category_name: true,
        category_description: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_order_item_purchase_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderItemPurchaseSnapshot> {
    return {
      id: input.id,
      product_name: input.product_name,
      product_description: input.product_description,
      product_base_price: input.product_base_price,
      variant_sku: input.variant_sku,
      variant_option_values: input.variant_option_values,
      variant_price: input.variant_price,
      seller_shop_name: input.seller_shop_name,
      seller_shop_description: input.seller_shop_description ?? undefined,
      category_name: input.category_name,
      category_description: input.category_description ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
