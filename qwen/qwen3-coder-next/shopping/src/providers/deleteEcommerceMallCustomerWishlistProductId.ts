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

export async function deleteEcommerceMallCustomerWishlistProductId(props: {
  customer: CustomerPayload;
  productId: string;
}): Promise<void> {
  await MyGlobal.prisma.ecommerce_mall_wishlist_items.delete({
    where: {
      customer_id_product_id: {
        customer_id: props.customer.id,
        product_id: props.productId,
      },
    },
  });
}
