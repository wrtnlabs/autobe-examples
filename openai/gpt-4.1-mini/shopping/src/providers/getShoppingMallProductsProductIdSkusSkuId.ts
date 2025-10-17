import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function getShoppingMallProductsProductIdSkusSkuId(props: {
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSku> {
  const { productId, skuId } = props;

  const sku = await MyGlobal.prisma.shopping_mall_skus.findFirstOrThrow({
    where: {
      id: skuId,
      shopping_mall_product_id: productId,
      deleted_at: null,
      status: "Active",
    },
  });

  return {
    id: sku.id,
    shopping_mall_product_id: sku.shopping_mall_product_id,
    sku_code: sku.sku_code,
    price: sku.price,
    weight: sku.weight ?? null,
    status: sku.status,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    deleted_at: sku.deleted_at ? toISOStringSafe(sku.deleted_at) : undefined,
  };
}
