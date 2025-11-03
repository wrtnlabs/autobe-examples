import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductCode(props: {
  admin: AdminPayload;
  productCode: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const { admin, productCode, body } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: productCode,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  const updatedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: product.id },
    data: {
      name: body.name,
      description: body.description ?? null,
      brand: body.brand ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedProduct.id,
    code: updatedProduct.code,
    name: updatedProduct.name,
    description: updatedProduct.description ?? null,
    brand: updatedProduct.brand ?? null,
    created_at: toISOStringSafe(updatedProduct.created_at),
    updated_at: toISOStringSafe(updatedProduct.updated_at),
    deleted_at: updatedProduct.deleted_at
      ? toISOStringSafe(updatedProduct.deleted_at)
      : null,
  };
}
