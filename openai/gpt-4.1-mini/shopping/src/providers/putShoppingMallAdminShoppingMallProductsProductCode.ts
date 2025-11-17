import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallProductsProductCode(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.body.shopping_mall_category_id },
  });

  if (!category) {
    throw new HttpException("Invalid category", 400);
  }

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { code: props.productCode },
    data: {
      title: props.body.title,
      description:
        props.body.description === undefined
          ? product.description
          : props.body.description === null
            ? null
            : props.body.description,
      brand:
        props.body.brand === undefined
          ? product.brand
          : props.body.brand === null
            ? null
            : props.body.brand,
      shopping_mall_category_id: props.body.shopping_mall_category_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    title: updated.title,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    brand: updated.brand === null ? null : (updated.brand ?? undefined),
    shopping_mall_category: {
      id: category.id,
      name: category.name,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
