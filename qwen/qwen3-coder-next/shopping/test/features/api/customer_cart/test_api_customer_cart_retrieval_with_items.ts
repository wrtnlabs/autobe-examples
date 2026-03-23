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

export async function test_api_customer_cart_retrieval_with_items(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string>() as string & tags.Format<"email">;
  const customerData = {
    email: (email ?? "") satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuth);
  // Step 2: Get customer's profile to ensure authentication works
  const customer = customerAuth.customer;
  TestValidator.equals(
    "customer email matches",
    customer.email,
    customerData.email,
  );
  // Step 3: Add product variant to cart (create a cart item)
  // First, we need to create a product variant - but we don't have product creation API
  // So we'll generate a random variant_id for cart item creation
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
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
  // Step 4: Verify cart item structure
  TestValidator.equals("cart item has user_id", cartItem.user_id, customer.id);
  TestValidator.equals(
    "cart item has variant_id",
    cartItem.variant_id,
    cartItem.variant?.id,
  );
  TestValidator.predicate(
    "cart item has positive quantity",
    cartItem.quantity > 0,
  );
  TestValidator.predicate(
    "cart item has positive subtotal",
    cartItem.subtotal >= 0,
  );
  // Step 5: Retrieve customer's cart
  const cart =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // Step 6: Validate cart response structure
  TestValidator.predicate("cart has items array", Array.isArray(cart.items));
  TestValidator.predicate(
    "cart has non-negative total",
    cart.total_amount >= 0,
  );
  TestValidator.predicate(
    "cart has validation_warnings array",
    Array.isArray(cart.validation_warnings),
  );
  // Step 7: Verify cart contains our added item
  const foundItem = cart.items.find((item) => item.id === cartItem.id);
  TestValidator.notEquals("cart contains our item", foundItem, undefined);
  if (foundItem) {
    TestValidator.equals("cart item id matches", foundItem.id, cartItem.id);
    TestValidator.equals(
      "cart item quantity matches",
      foundItem.quantity,
      cartItem.quantity,
    );
    TestValidator.equals(
      "cart item subtotal matches",
      foundItem.subtotal,
      cartItem.subtotal,
    );
    TestValidator.equals(
      "cart item user_id matches",
      foundItem.user_id,
      customer.id,
    );
  }
  // Step 8: Test cart with multiple items
  const additionalItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(additionalItem);
  const updatedCart =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(updatedCart);
  TestValidator.equals(
    "cart item count increased",
    updatedCart.items.length,
    2,
  );
  // Step 9: Verify total amount calculation
  const expectedTotal = cartItem.subtotal + additionalItem.subtotal;
  TestValidator.equals(
    "cart total amount correct",
    updatedCart.total_amount,
    expectedTotal,
  );
}