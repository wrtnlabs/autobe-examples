import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check cart existence and ownership
  const cart = await MyGlobal.prisma.shopping_carts.findUnique({
    where: { id: props.cartId },
  });
  if (!cart || cart.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own cart",
      403,
    );
  }

  await MyGlobal.prisma.shopping_carts.delete({ where: { id: props.cartId } });
}
