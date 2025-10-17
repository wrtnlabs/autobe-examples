import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { shopping_mall_seller_id: true },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own products",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_products.delete({
    where: {
      id: props.productId,
    },
  });
}
