import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_price_immutable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://test.example.com/register",
      referrer: "http://test.example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create customer-specific connection with token
  const customerAuthConnection: api.IConnection = { host: connection.host };
  customerAuthConnection.headers = {
    Authorization: customerJoin.token.access,
  };
  // 3. Generate test data
  const originalPrice = typia.random<number & tags.Minimum<100>>();
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to update cart item with changed quantity
  const originalQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const newQuantity = originalQuantity + 5;
  const updateBody: IEcommerceMallCartItem.IUpdate = {
    quantity: newQuantity,
  } satisfies IEcommerceMallCartItem.IUpdate;
  const updatedItem =
    await api.functional.ecommerceMall.customer.carts.cartItems.update(
      customerAuthConnection,
      {
        cartId,
        cartItemId,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);
  // 5. Validate that price remained unchanged (immutable)
  TestValidator.equals(
    "price should be immutable after update",
    updatedItem.price,
    originalPrice,
  );
  // 6. Validate that quantity was updated successfully (mutable)
  TestValidator.equals(
    "quantity should be updated to new value",
    updatedItem.quantity,
    newQuantity,
  );
  // 7. Validate that updated_at timestamp changed (quantity update triggered)
  const originalUpdatedAt = new Date(updatedItem.created_at);
  const updatedUpdatedAt = new Date(updatedItem.updated_at);
  TestValidator.notEquals(
    "updated_at should change after quantity update",
    originalUpdatedAt.toISOString(),
    updatedUpdatedAt.toISOString(),
  );
}
