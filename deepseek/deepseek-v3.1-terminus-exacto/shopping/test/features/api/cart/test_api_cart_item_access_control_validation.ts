import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";

/**
 * Test access control validation when attempting to retrieve a cart item that belongs to another customer.
 * Create two separate customer accounts, have the first customer add an item to their cart,
 * then attempt to retrieve that cart item using the second customer's authentication.
 * The system should return a 404 error since customers can only access their own cart items.
 */
export async function test_api_cart_item_access_control_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first customer account
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Join = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1_password",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer1Join);
  // Create second customer account
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Join = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer2_password",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer2Join);
  // Note: This scenario assumes that customers have existing carts
  // Since cart creation is not available in the provided API functions,
  // we need to work with an existing cart structure
  // For this test, we need to create a scenario where:
  // 1. Customer1 has a cart and adds an item
  // 2. Customer2 attempts to access that cart item
  // Since cart creation endpoint is not available, we'll need to simulate
  // a scenario where we know a cart exists and belongs to customer1
  // and customer2 attempts to access it
  // First, ensure customer1 has a cart by attempting to add an item
  // (this assumes the system creates a cart if none exists)
  const cartItemBody = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IEcommerceCartItem.ICreate;
  // Create a cart item for customer1
  const customer1CartItem =
    await api.functional.ecommerce.customer.carts.items.create(
      customer1Connection,
      {
        cartId: customer1Join.id, // Use customer ID as cart ID (common pattern)
        body: cartItemBody,
      },
    );
  typia.assert(customer1CartItem);
  // Now attempt to retrieve the cart item using customer2's authentication
  // This should fail with 404 since customers can only access their own cart items
  await TestValidator.httpError(
    "should return 404 when accessing another customer's cart item",
    404,
    async () => {
      await api.functional.ecommerce.customer.carts.items.at(
        customer2Connection,
        {
          cartId: customer1Join.id, // Attempt to access customer1's cart
          itemId: customer1CartItem.id, // Attempt to access customer1's cart item
        },
      );
    },
  );
}
