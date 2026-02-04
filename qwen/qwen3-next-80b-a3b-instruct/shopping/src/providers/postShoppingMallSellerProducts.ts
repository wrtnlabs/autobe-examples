import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Use the already-loaded collector to transform DTO to Prisma input
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: await ShoppingMallProductCollector.collect({
      body: props.body,
      seller: { id: props.seller.id },
    }),
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      category_id: true,
      seller_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Return the created product with proper typing
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    base_price: created.base_price,
    category_id: created.category_id,
    seller_id: created.seller_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at,
  };
}
