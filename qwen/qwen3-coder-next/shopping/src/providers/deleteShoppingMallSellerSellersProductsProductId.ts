import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerSellersProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { id: true },
    });
  if (variants.length > 0) {
    const variantIds = variants.map((v) => v.id);
    const pendingOrderItems =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_order_variant_snapshot_id: { in: variantIds },
          item_status: { in: ["paid", "shipped"] },
        },
      });
    if (pendingOrderItems !== null) {
      throw new HttpException("Product has pending orders", 400);
    }
  }
  const variantIds = variants.map((v) => v.id);
  await MyGlobal.prisma.shopping_mall_product_images.deleteMany({
    where: { shopping_mall_product_id: props.productId },
  });
  await MyGlobal.prisma.shopping_mall_inventory_histories.deleteMany({
    where: { shopping_mall_product_variant_id: { in: variantIds } },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.deleteMany({
    where: { shopping_mall_product_id: props.productId },
  });
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: props.productId },
  });
  await MyGlobal.prisma.shopping_mall_customer_wishlists.deleteMany({
    where: { shopping_mall_product_id: props.productId },
  });
}
