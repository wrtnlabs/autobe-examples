import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(registered);
  // 2. Create a cart item first using the update endpoint (simulates creation)
  const initialCartItem =
    await api.functional.ecommerceMall.customer.cart.items.update(
      customerConnection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          quantity: 1,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(initialCartItem);
  // 3. Update cart item quantity
  const newQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<10>
  >() satisfies number as number;
  const updated = await api.functional.ecommerceMall.customer.cart.items.update(
    customerConnection,
    {
      itemId: initialCartItem.id,
      body: {
        quantity: newQuantity,
      } satisfies IEcommerceMallCartItem.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validation
  TestValidator.equals("quantity updated", updated.quantity, newQuantity);
  TestValidator.equals("user matches", updated.user_id, registered.customer.id);
}
