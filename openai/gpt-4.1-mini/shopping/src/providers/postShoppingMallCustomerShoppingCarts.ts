import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingCart.ICreate;
}): Promise<IShoppingMallShoppingCart> {
  const { customer, body } = props;

  // Verify authenticated customer exists
  const customerExists =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: customer.id },
      select: { id: true },
    });

  if (!customerExists) {
    throw new HttpException("Customer not found", 404);
  }

  // Check for existing active cart with same customer and session
  const existingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst({
      where: {
        shopping_mall_customer_id: body.shopping_mall_customer_id,
        shopping_mall_customer_session_id:
          body.shopping_mall_customer_session_id,
        deleted_at: null,
      },
    });

  if (existingCart !== null) {
    throw new HttpException(
      "Active shopping cart already exists for this customer and session",
      409,
    );
  }

  // Create new shopping cart
  const now = toISOStringSafe(new Date());

  const createdCart = await MyGlobal.prisma.shopping_mall_shopping_carts.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_customer_id: body.shopping_mall_customer_id,
        shopping_mall_customer_session_id:
          body.shopping_mall_customer_session_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: createdCart.id,
    shopping_mall_customer_id: createdCart.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      createdCart.shopping_mall_customer_session_id,
    created_at: toISOStringSafe(createdCart.created_at),
    updated_at: toISOStringSafe(createdCart.updated_at),
    deleted_at: null,
  };
}
