import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdAvailability(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProduct.IAvailability> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        status: true,
        variants: {
          where: { deleted_at: null },
          select: { stock_quantity: true },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
      },
    });
  const variantCount = product.variants.length;
  const inStockVariantCount = product.variants.filter(
    (v) => v.stock_quantity > 0,
  ).length;
  const hasVariants = variantCount > 0;
  const isAvailable =
    product.status === "active" && hasVariants && inStockVariantCount > 0;
  return {
    isAvailable,
    status: product.status,
    variantCount,
    inStockVariantCount,
    hasVariants,
  } satisfies IEcommerceMallProduct.IAvailability;
}
