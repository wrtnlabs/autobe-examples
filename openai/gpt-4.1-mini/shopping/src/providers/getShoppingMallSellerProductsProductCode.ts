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

export async function getShoppingMallSellerProductsProductCode(props: {
  seller: SellerPayload;
  productCode: string;
}): Promise<IShoppingMallProduct> {
  const { productCode } = props;

  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        code: productCode,
        deleted_at: null,
      },
    },
  );

  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description ?? null,
    brand: product.brand ?? null,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: null,
  };
}
