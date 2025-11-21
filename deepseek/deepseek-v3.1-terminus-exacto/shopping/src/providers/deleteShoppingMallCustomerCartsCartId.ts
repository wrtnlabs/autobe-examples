import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify cart exists, belongs to customer, and is not already deleted
  const existingCart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      deleted_at: null,
    },
  });

  if (!existingCart) {
    throw new HttpException(
      "Cart not found or you don't have permission to delete it",
      404,
    );
  }

  // Perform soft deletion by setting deleted_at timestamp
  const currentTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
}
