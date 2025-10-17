import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { seller, productId, body } = props;

  // Fetch the product to verify ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: productId },
    });

  // Verify seller owns this product
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own products",
      403,
    );
  }

  // Check if product is soft-deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found or has been deleted", 404);
  }

  // Update the product
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: productId },
    data: {
      name: body.name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated product matching IShoppingMallProduct interface
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
  };
}
