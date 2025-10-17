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

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUniqueOrThrow({
    where: {
      id: skuId,
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
      sku_code: true,
      price: true,
    },
  });

  if (sku.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "SKU does not belong to the specified product",
      403,
    );
  }

  return {
    id: sku.id,
    sku_code: sku.sku_code,
    price: sku.price,
  };
}
