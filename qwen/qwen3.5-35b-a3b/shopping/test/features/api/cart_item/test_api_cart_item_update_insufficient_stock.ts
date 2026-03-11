import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

/**
 * Test cart item update fails when quantity exceeds available stock.
 *
 * 1. Create customer account
 * 2. Attempt to update cart item with excessive quantity (exceeds stock)
 * 3. Verify update fails with appropriate insufficient stock error
 *
 * Note: Test database must contain cart items with limited stock for this test.
 */
export async function test_api_cart_item_update_insufficient_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create new account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string &
        tags.Format<"email"> as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Prepare update with excessive quantity (significantly exceeds typical stock)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const excessiveQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100000>
  >();
  // 3. Verify update fails with insufficient stock error
  await TestValidator.error("insufficient stock error", async () => {
    await api.functional.ecommerceMall.customer.carts.items.update(
      customerConnection,
      {
        cartId,
        itemId,
        body: {
          quantity: excessiveQuantity,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  });
}
