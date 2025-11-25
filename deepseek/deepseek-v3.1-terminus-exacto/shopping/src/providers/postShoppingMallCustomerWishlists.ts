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
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  // Check if wishlist name already exists for this customer
  const existingWishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        name: props.body.name,
        deleted_at: null,
      },
    });

  if (existingWishlist) {
    throw new HttpException(
      "Wishlist name already exists for this customer",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      name: props.body.name,
      description: props.body.description ?? null,
      is_public: props.body.is_public,
      priority: props.body.priority,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Fetch customer with necessary relationships for summary
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Convert status to the correct union type
  const status =
    created.status === "active" ||
    created.status === "archived" ||
    created.status === "shared"
      ? created.status
      : ("active" as "active" | "archived" | "shared");

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? undefined,
    is_public: created.is_public,
    priority: created.priority,
    status: status,
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone_number: customer.phone_number ?? undefined,
      status: customer.status,
      created_at: toISOStringSafe(customer.created_at),
      updated_at: customer.updated_at
        ? toISOStringSafe(customer.updated_at)
        : undefined,
    },
    items: [], // Empty array instead of undefined
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
