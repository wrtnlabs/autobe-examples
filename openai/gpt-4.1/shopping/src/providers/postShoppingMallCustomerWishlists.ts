import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  // Check for existing wishlist for this customer
  const existing = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: { shopping_mall_customer_id: props.customer.id },
  });
  if (existing) {
    throw new HttpException("Wishlist already exists for this customer.", 409);
  }
  // Fetch customer summary for association
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
