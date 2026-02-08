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

export async function getShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
    select: {
      id: true,
      seller_id: true,
      product_subcategory_id: true,
      name: true,
      description: true,
      base_price: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  return {
    id: product.id,
    seller_id: product.seller_id,
    product_subcategory_id: product.product_subcategory_id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
  };
}
