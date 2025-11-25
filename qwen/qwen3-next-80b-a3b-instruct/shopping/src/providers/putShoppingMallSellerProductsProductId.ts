import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const existing = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });

  if (!existing) {
    throw new HttpException("Product not found", 404);
  }

  if (existing.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Archived product cannot be updated", 400);
  }

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body as any),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return updated.id as any;
}
