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

export async function putShoppingMallCustomerShoppingMallFavoriteProductsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallFavoriteProduct.IUpdate;
}): Promise<IShoppingMallFavoriteProduct> {
  const existing =
    await MyGlobal.prisma.shopping_mall_favorite_products.findUnique({
      where: {
        id: props.id,
      },
    });

  if (
    existing === null ||
    existing.shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Favorite product not found or access denied", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_favorite_products.update({
    where: { id: props.id },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id === null
        ? undefined
        : updated.shopping_mall_customer_session_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
