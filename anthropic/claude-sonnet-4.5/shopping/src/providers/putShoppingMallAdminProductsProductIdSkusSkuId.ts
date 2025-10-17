import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdSkusSkuId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallSku.IUpdate;
}): Promise<IShoppingMallSku> {
  const { admin, productId, skuId, body } = props;

  const existingSku =
    await MyGlobal.prisma.shopping_mall_skus.findUniqueOrThrow({
      where: { id: skuId },
    });

  if (existingSku.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "SKU does not belong to the specified product",
      400,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_skus.update({
    where: { id: skuId },
    data: {
      price: body.price ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    sku_code: updated.sku_code,
    price: updated.price,
  };
}
