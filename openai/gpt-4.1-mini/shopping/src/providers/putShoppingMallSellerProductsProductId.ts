import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  return {
    id: updated.id,
    seller_id: updated.seller_id,
    product_subcategory_id: updated.product_subcategory_id,
    name: updated.name,
    description: updated.description,
    base_price: updated.base_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
