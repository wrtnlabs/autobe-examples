import { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceOrderItemSnapshotVariantTransformer } from "../transformers/EcommerceOrderItemSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerOrdersOrderIdItemsItemIdSnapshotVariant(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemSnapshotVariant> {
  // Find the order item first
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        ecommerce_order_id: props.orderId,
      },
      select: {
        id: true,
        ecommerce_product_variant_id: true,
      },
    });
  // Get the variant to extract product_id
  const variant =
    await MyGlobal.prisma.ecommerce_product_variants.findFirstOrThrow({
      where: {
        id: orderItem.ecommerce_product_variant_id,
      },
      select: {
        product_id: true,
      },
    });
  // Get the product to verify seller ownership
  const product = await MyGlobal.prisma.ecommerce_products.findFirstOrThrow({
    where: {
      id: variant.product_id,
    },
    select: {
      seller_id: true,
    },
  });
  // Verify seller owns the product
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find and transform the variant snapshot with all nested data
  const record =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variants.findFirstOrThrow(
      {
        where: {
          ecommerceOrderItemSnapshot: {
            ecommerce_order_item_id: props.itemId,
          },
        },
        ...EcommerceOrderItemSnapshotVariantTransformer.select(),
      },
    );
  return await EcommerceOrderItemSnapshotVariantTransformer.transform(record);
}
