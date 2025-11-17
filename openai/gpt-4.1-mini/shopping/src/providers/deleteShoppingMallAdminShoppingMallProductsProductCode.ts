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
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
    select: { id: true },
  });

  if (!product) {
    throw new HttpException(
      `Product with code ${props.productCode} not found`,
      404,
    );
  }

  const variantIds = await MyGlobal.prisma.shopping_mall_product_variants
    .findMany({
      where: { product: { id: product.id } },
      select: { id: true },
    })
    .then((variants) => variants.map((v) => v.id));

  await MyGlobal.prisma.$transaction(async (tx) => {
    if (variantIds.length > 0) {
      await tx.shopping_mall_inventories.deleteMany({
        where: { shopping_mall_product_variant_id: { in: variantIds } },
      });

      await tx.shopping_mall_product_variants.deleteMany({
        where: { id: { in: variantIds } },
      });
    }

    await tx.shopping_mall_products.delete({
      where: { id: product.id },
    });
  });
}
