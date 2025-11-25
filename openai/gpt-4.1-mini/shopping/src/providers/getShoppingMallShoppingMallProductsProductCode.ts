import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function getShoppingMallShoppingMallProductsProductCode(props: {
  productCode: string;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
    // Removed invalid include for shopping_mall_category
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  return {
    id: product.id as string & tags.Format<"uuid">,
    code: product.code,
    title: product.title,
    description: product.description ?? undefined,
    brand: product.brand ?? undefined,
    // Since shopping_mall_category relations is not included, create minimal category object with only id and empty name
    shopping_mall_category: {
      id: product.shopping_mall_category_id as string & tags.Format<"uuid">,
      name: "",
    },
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
  };
}
