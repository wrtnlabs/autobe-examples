import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, id } = props;

  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id },
      select: { shopping_mall_customer_id: true },
    });

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own wishlists",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id },
  });
}
