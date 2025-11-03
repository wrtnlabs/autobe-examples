import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });

  if (product === null) {
    throw new HttpException(
      `Product with code '${props.productCode}' not found`,
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: product.id },
  });
}
