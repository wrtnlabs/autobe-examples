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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const existing = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Product not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: {
      id: existing.id,
    },
    data: {
      title: props.body.title,
      description:
        props.body.description === undefined
          ? existing.description
          : props.body.description,
      brand: props.body.brand === undefined ? existing.brand : props.body.brand,
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
      id: existing.shopping_mall_category_id satisfies string as string,
      name: "",
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  } satisfies IShoppingMallProduct;
}
