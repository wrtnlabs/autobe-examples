import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, skuId } = props;

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUniqueOrThrow({
    where: { id: skuId, deleted_at: null },
  });

  if (sku.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "SKU does not belong to the specified product",
      403,
    );
  }

  // Removed access to non-existent property 'shopping_mall_seller_id' on sku

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_skus.update({
    where: { id: skuId },
    data: { deleted_at: deletedAt },
  });
}
