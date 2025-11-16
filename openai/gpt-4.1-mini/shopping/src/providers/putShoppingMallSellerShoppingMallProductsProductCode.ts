import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const existing = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode, deleted_at: null },
  });

  if (!existing) {
    throw new HttpException("Product not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { code: props.productCode },
    data: {
      name: props.body.name ?? existing.name,
      description:
        props.body.description !== undefined
          ? props.body.description
          : existing.description,
      is_active: props.body.is_active ?? existing.is_active,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    code: updated.code,
    name: updated.name,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
