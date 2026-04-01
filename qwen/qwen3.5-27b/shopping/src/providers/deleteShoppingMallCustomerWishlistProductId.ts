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

export async function deleteShoppingMallCustomerWishlistProductId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the wishlist item exists and belongs to the customer
  await MyGlobal.prisma.shopping_mall_wishlist_items.findUniqueOrThrow({
    where: {
      id: props.productId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  // Permanently delete the wishlist item (no soft delete)
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: {
      id: props.productId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
}
