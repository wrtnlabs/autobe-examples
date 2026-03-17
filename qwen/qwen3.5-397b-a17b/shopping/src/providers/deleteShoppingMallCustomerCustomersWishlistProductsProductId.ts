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

export async function deleteShoppingMallCustomerCustomersWishlistProductsProductId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlistEntry = await MyGlobal.prisma.shopping_mall_wishlists.findFirst(
    {
      where: {
        customer_id: props.customer.id,
        product_id: props.productId,
      },
    },
  );
  if (wishlistEntry !== null) {
    await MyGlobal.prisma.shopping_mall_wishlists.delete({
      where: {
        id: wishlistEntry.id,
      },
    });
    return;
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
    },
    select: {
      id: true,
    },
  });
  if (product === null) {
    return;
  }
  throw new HttpException("Not Found", 404);
}
