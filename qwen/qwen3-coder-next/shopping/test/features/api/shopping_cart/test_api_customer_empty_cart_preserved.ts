import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartValidationWarning";
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

export async function test_api_customer_empty_cart_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joined);
  // Update connection with new token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: joined.token.access,
  };
  // 2. Add an item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      authenticatedConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 3. Verify cart has item before removal
  let cart = await api.functional.ecommerceMall.customer.cart.at(
    authenticatedConnection,
  );
  typia.assert(cart);
  TestValidator.equals("initially has items", cart.items.length, 1);
  // 4. Empty cart and verify empty state
  cart = await api.functional.ecommerceMall.customer.cart.at(
    authenticatedConnection,
  );
  typia.assert(cart);
  // 5. Validate empty cart preserves state
  TestValidator.equals("items array is empty", cart.items.length, 0);
  TestValidator.equals("total amount is 0", cart.total_amount, 0);
  TestValidator.equals(
    "validation warnings is empty",
    cart.validation_warnings.length,
    0,
  );
}