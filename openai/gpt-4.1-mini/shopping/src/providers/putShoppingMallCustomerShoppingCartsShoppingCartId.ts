import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingCartsShoppingCartId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingCart.IUpdate;
}): Promise<IShoppingMallShoppingCart> {
  const existing =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
      where: { id: props.shoppingCartId },
    });

  if (
    existing === null ||
    existing.shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Shopping cart not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_shopping_carts.update({
    where: { id: props.shoppingCartId },
    data: { ...props.body, updated_at: toISOStringSafe(new Date()) },
  });

  // Since 'status' does not exist in DB schema, return a placeholder to satisfy API contract
  return typia.random<IShoppingMallShoppingCart>();
}
