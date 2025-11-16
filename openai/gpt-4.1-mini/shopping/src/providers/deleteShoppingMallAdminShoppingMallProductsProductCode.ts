import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallProductsProductCode(props: {
  admin: AdminPayload;
  productCode: string;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
  });
  if (!existing) {
    throw new HttpException("Product not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { code: props.productCode },
  });
}
