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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const { seller, productCode, body } = props;

  // Find the product by code
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { code: productCode },
    });

  // Update product with new values
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { code: productCode },
    data: {
      name: body.name,
      description: body.description ?? null,
      brand: body.brand ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated product with dates converted to ISO strings
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    brand: updated.brand ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
