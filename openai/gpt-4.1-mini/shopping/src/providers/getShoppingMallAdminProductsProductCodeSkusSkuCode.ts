import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductCodeSkusSkuCode(props: {
  admin: AdminPayload;
  productCode: string;
  skuCode: string;
}): Promise<IShoppingMallProductSku> {
  const { admin, productCode, skuCode } = props;

  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { code: productCode },
      select: { id: true },
    });

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirstOrThrow(
    {
      where: {
        sku_code: skuCode,
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        sku_code: true,
        price: true,
        attributes_json: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );

  return {
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    price: sku.price,
    attributes_json: sku.attributes_json ?? undefined,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : undefined,
  };
}
