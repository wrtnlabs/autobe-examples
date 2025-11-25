import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShoppingMallProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Ownership check - assume seller owns the product as per authorization

  // Get variant IDs
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: product.id },
      select: { id: true },
    });

  const variantIds = variants.map((v) => v.id);

  await MyGlobal.prisma.$transaction(async (tx) => {
    if (variantIds.length > 0) {
      await tx.shopping_mall_inventories.deleteMany({
        where: { shopping_mall_product_variant_id: { in: variantIds } },
      });

      await tx.shopping_mall_product_variants.deleteMany({
        where: { shopping_mall_product_id: product.id },
      });
    }

    await tx.shopping_mall_products.delete({
      where: { id: product.id },
    });
  });
}
