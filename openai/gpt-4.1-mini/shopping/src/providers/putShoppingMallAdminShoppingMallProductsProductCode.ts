import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallProductsProductCode(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const existing = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { code: props.productCode },
  });
  if (!existing) {
    throw new HttpException("Product not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { code: props.productCode },
    data: {
      name: props.body.name ?? undefined,
      description:
        props.body.description !== undefined
          ? props.body.description
          : undefined,
      is_active: props.body.is_active ?? undefined,
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
        : updated.deleted_at !== undefined
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
