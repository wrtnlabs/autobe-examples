import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a cart item with initial quantity of 1
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          quantity: 1,
          variantId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItem);
  const originalQuantity: number = cartItem.quantity satisfies number as number;
  const newQuantity: number = originalQuantity + 2;
  // 3. Update cart item quantity to a positive number
  const updatedItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.update(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: newQuantity,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // 4. Validate the updated cart item
  TestValidator.equals("quantity updated", updatedItem.quantity, newQuantity);
  TestValidator.equals(
    "product variant preserved",
    updatedItem.productVariant.id,
    cartItem.productVariant.id,
  );
  TestValidator.equals(
    "unit price unchanged",
    updatedItem.unitPrice,
    cartItem.unitPrice,
  );
  TestValidator.equals(
    "line subtotal recalculated",
    updatedItem.lineSubtotal,
    updatedItem.unitPrice * newQuantity,
  );
  TestValidator.predicate(
    "updatedAt timestamp is set",
    updatedItem.updatedAt > cartItem.createdAt,
  );
}
