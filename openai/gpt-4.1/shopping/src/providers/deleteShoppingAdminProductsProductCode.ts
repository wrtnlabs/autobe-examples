import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminProductsProductCode(props: {
  admin: AdminPayload;
  productCode: string;
}): Promise<void> {
  // Find the product by code
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Perform hard delete by code (globally unique)
  await MyGlobal.prisma.shopping_products.delete({
    where: { code: props.productCode },
  });
  // (Optional: audit log, out of scope per prompt)
}
