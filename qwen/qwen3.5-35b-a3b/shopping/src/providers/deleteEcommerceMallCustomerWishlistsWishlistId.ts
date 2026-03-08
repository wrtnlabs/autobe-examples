import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findUniqueOrThrow({
      where: {
        id: props.wishlistId,
        ecommerce_mall_customer_id: props.customer.id,
      },
    });
  await MyGlobal.prisma.ecommerce_mall_wishlists.delete({
    where: {
      id: props.wishlistId,
      ecommerce_mall_customer_id: props.customer.id,
    },
  });
}
