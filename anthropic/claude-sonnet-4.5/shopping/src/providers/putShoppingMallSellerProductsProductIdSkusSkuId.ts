import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallSku.IUpdate;
}): Promise<IShoppingMallSku> {
  const { seller, productId, skuId, body } = props;

  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only update SKUs for your own products",
      403,
    );
  }

  const existingSku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      id: skuId,
      shopping_mall_product_id: productId,
    },
  });

  if (!existingSku) {
    throw new HttpException(
      "SKU not found or does not belong to the specified product",
      404,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_skus.update({
    where: { id: skuId },
    data: {
      ...(body.price !== undefined && { price: body.price }),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      sku_code: true,
      price: true,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    sku_code: updated.sku_code,
    price: updated.price,
  };
}
