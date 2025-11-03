import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
}): Promise<void> {
  const { seller, productCode } = props;

  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: productCode },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  if (product.shopping_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own product.",
      403,
    );
  }

  await MyGlobal.prisma.shopping_products.update({
    where: { id: product.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
