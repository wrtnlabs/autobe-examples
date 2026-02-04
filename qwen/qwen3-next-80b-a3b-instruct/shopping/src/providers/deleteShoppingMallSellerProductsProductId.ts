import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  // 1. Check if product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Verify seller owns this product
  if (product.seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden - You can only delete your own products",
      403,
    );
  }
  // 2. Check for order items with status 'paid', 'shipped', or 'delivered'
  const restrictedOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        product_id: props.productId,
        status: { in: ["paid", "shipped", "delivered"] },
      },
    });
  if (restrictedOrderItems.length > 0) {
    throw new HttpException(
      "Cannot delete product with associated paid, shipped, or delivered order items",
      400,
    );
  }
  // 3. Perform cascade deletion (delete product_images and product)
  // Prisma will handle cascade deletion based on schema relationships
  // We'll explicitly delete product_images first, then product
  const deletedImages =
    await MyGlobal.prisma.shopping_mall_product_images.deleteMany({
      where: { product: { id: props.productId } },
    });
  const deletedProduct = await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: props.productId },
  });
  // 4. Log deletion in audit trail (implementation depends on audit system)
  // Since we don't have audit schema, we'll assume this is handled by system
  // 5. Return deleted product for audit
  return {
    id: deletedProduct.id,
    name: deletedProduct.name,
    seller_id: deletedProduct.seller_id,
    created_at: toISOStringSafe(deletedProduct.created_at),
  };
}
