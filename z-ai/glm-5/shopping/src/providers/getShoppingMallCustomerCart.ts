import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartTransformer } from "../transformers/ShoppingMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCart(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
    ...ShoppingMallCartTransformer.select(),
  });
  if (cart === null) {
    const customer =
      await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
        where: { id: props.customer.id },
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          banned: true,
          created_at: true,
        },
      });
    return {
      id: v4() as string & tags.Format<"uuid">,
      customer: {
        id: customer.id,
        email: customer.email,
        displayName: customer.display_name,
        phoneNumber: customer.phone_number,
        banned: customer.banned,
        createdAt: customer.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IShoppingMallCustomer.ISummary,
      items: [],
      total: 0,
      created_at: customer.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: customer.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IShoppingMallCart;
  }
  return ShoppingMallCartTransformer.transform(cart);
}
