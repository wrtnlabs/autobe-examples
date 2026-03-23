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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_removal_different_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer registers and logs in
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string>() satisfies string & tags.Format<"email"> as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. First customer adds cart item
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customer1Connection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 3. Second customer registers and logs in
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string>() satisfies string & tags.Format<"email"> as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 4. Second customer attempts to delete first customer's cart item
  await TestValidator.error(
    "cannot delete other customer's cart item",
    async () => {
      await api.functional.ecommerceMall.customer.cart.items.erase(
        customer2Connection,
        {
          itemId: cartItem.id,
        },
      );
    },
  );
  // 5. Verify first customer can still access their cart item
  // (Add another item to verify cart functionality still works)
  const newItem = await api.functional.ecommerceMall.customer.cart.items.create(
    customer1Connection,
    {
      body: {
        variant_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(newItem);
  TestValidator.notEquals("new item has different ID", newItem.id, cartItem.id);
}