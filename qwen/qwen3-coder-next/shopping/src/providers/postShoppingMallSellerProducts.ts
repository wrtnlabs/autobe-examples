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

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  // Create product with all required fields including name, description, base_price
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      status: "draft",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
    },
    select: {
      id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shopping_mall_seller_id: true,
    },
  });
  // Return product structure matching IShoppingMallProduct
  return {
    id: created.id,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
    seller_id: created.shopping_mall_seller_id,
    seller: {
      id: props.seller.id,
    },
  };
}
