import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallFavoriteProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteProduct.ICreate;
}): Promise<IShoppingMallFavoriteProduct> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_favorite_products.create({
    data: {
      id,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_customer_session_id: null,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
