import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate that an authenticated customer can retrieve a specific cart item
 * using the 'get /shoppingMall/customer/carts/{cartId}/items/{itemId}' API
 * endpoint.
 *
 * Business context:
 *
 * - Carts and cart items are tied to a unique customer, and
 *   authentication/authorization must prevent cross-user access.
 * - Cart items reference SKUs, which are usually bootstrapped into the system
 *   beforehand (but for this test we will simulate/mock a valid SKU UUID, since
 *   no creation API is available).
 *
 * Step-by-step process:
 *
 * 1. Register a new customer using unique randomized info to receive
 *    authentication token and customer context.
 * 2. Create a new shopping mall cart. (No payload required, but customer
 *    authentication must be active.)
 * 3. Synthesize or mock a valid SKU UUID for the productSku to use in the item.
 *    (Since no SKU creation API in scope, simulate an existing UUID.)
 * 4. Add a new cart item (SKU) to the cart using the mocked SKU and a valid
 *    quantity.
 * 5. Retrieve the cart item using the get API
 *    ('/shoppingMall/customer/carts/{cartId}/items/{itemId}').
 * 6. Assert that the response structure is correct and contains all expected
 *    details (id, cart reference, quantity, created/updated timestamps, and
 *    productSku information).
 * 7. Negative test: Attempt retrieval using another authenticated customer and
 *    expect access to be denied (if such logic is supported by the
 *    implementation).
 */
export async function test_api_cart_item_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer with unique data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const name = RandomGenerator.name();
  const phone = "010" + RandomGenerator.alphaNumeric(8);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password,
      name,
      phone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create cart for this customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Synthesize a valid productSku id (simulate an existing SKU - since no create API exists)
  const productSku: IShoppingMallProductSku.ISummary =
    typia.random<IShoppingMallProductSku.ISummary>();

  // 4. Add the SKU as a cart item with quantity 1
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_sku_id: productSku.id,
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 5. Retrieve the cart item by IDs
  const retrieved = await api.functional.shoppingMall.customer.carts.items.at(
    connection,
    {
      cartId: cart.id,
      itemId: cartItem.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved cart item matches created",
    retrieved,
    cartItem,
  );

  // 6. Negative: Register another customer and try to fetch the item (expect error)
  const email2 = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: email2,
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(),
      phone: "010" + RandomGenerator.alphaNumeric(8),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer2);

  await TestValidator.error(
    "cross-user retrieval should be forbidden",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.at(connection, {
        cartId: cart.id,
        itemId: cartItem.id,
      });
    },
  );
}
