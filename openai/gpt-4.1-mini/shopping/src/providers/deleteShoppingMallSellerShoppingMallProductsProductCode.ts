import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  // Step 1: Find the product by productCode
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
  });

  // Step 2: If the product does not exist, throw 404
  if (!product) {
    throw new HttpException(`Product not found: ${props.productCode}`, 404);
  }

  // Step 3: Verify that the authenticated seller owns the product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product.", 403);
  }

  // Step 4: Delete the product (hard delete) along with related SKUs (assumed to cascade)
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { code: props.productCode },
  });
}
