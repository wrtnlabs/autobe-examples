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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_cart_retrieval_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve or create a shopping cart
  const cartResponse: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.carts.index(
      customerConnection,
      {
        body: typia.random<IEcommerceMallCartItem.IRequest>(),
      },
    );
  typia.assert(cartResponse);
  // Create a new cart if no existing cart found
  let cartId =
    cartResponse.data.length > 0 ? cartResponse.data[0].variant.id : "";
  if (cartId === "") {
    // Create cart by adding an item (triggers cart creation)
    const fakeProductId = typia.random<string & tags.Format<"uuid">>();
    const fakeVariantId = typia.random<string & tags.Format<"uuid">>();
    try {
      const tempCartItem =
        await api.functional.ecommerceMall.customer.carts.cartItems.create(
          customerConnection,
          {
            cartId: "00000000-0000-0000-0000-000000000000", // This will fail, but we'll catch it
            body: {
              variant_id: fakeVariantId,
              quantity: 1,
            } satisfies IEcommerceMallCartItem.ICreate,
          },
        );
      typia.assert(tempCartItem);
    } catch {
      // Expected to fail since cart doesn't exist yet
    }
    // Retry to get cart after attempted creation
    const retryResponse: IPageIEcommerceMallCartItem.ISummary =
      await api.functional.ecommerceMall.customer.carts.index(
        customerConnection,
        {
          body: typia.random<IEcommerceMallCartItem.IRequest>(),
        },
      );
    typia.assert(retryResponse);
    cartId =
      retryResponse.data.length > 0 ? retryResponse.data[0].variant.id : "";
  }
  // 3. Retrieve product variant details - create two different variants
  const productId1 = typia.random<string & tags.Format<"uuid">>();
  const variantId1 = typia.random<string & tags.Format<"uuid">>();
  const productId2 = typia.random<string & tags.Format<"uuid">>();
  const variantId2 = typia.random<string & tags.Format<"uuid">>();
  const variant1 = await api.functional.ecommerceMall.products.variants.at(
    customerConnection,
    {
      productId: productId1,
      variantId: variantId1,
    },
  );
  typia.assert(variant1);
  const variant2 = await api.functional.ecommerceMall.products.variants.at(
    customerConnection,
    {
      productId: productId2,
      variantId: variantId2,
    },
  );
  typia.assert(variant2);
  // 4. Add multiple product variants to the customer's cart
  const cartItem1 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId,
        body: {
          variant_id: variant1.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId,
        body: {
          variant_id: variant2.id,
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 5. Verify the price at addition time is captured
  const priceAtAddition1 = cartItem1.price;
  const priceAtAddition2 = cartItem2.price;
  // 6. Note: PUT /seller/products/{productId}/variants/{variantId} is not available in SDK
  // Price snapshot validation will be done when retrieving cart
  // 7. Call GET /customer/carts/{cartId} to retrieve the complete cart
  const retrievedCart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.at(customerConnection, {
      cartId,
    });
  typia.assert(retrievedCart);
  // 8. Validate the response
  // Validate cart metadata
  TestValidator.equals("cart has valid id", retrievedCart.id, cartId);
  TestValidator.equals(
    "cart has valid customer_id",
    retrievedCart.customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "cart has created_at",
    retrievedCart.created_at !== undefined,
  );
  TestValidator.predicate(
    "cart has updated_at",
    retrievedCart.updated_at !== undefined,
  );
  // Validate cart items
  TestValidator.equals("cart items count", retrievedCart.cart_items.length, 2);
  // Validate each cart item has correct variant references
  const item1 = retrievedCart.cart_items.find(
    (item) => item.variant.id === variant1.id,
  );
  const item2 = retrievedCart.cart_items.find(
    (item) => item.variant.id === variant2.id,
  );
  TestValidator.equals(
    "item 1 variant matches",
    item1?.variant.id,
    variant1.id,
  );
  TestValidator.equals(
    "item 2 variant matches",
    item2?.variant.id,
    variant2.id,
  );
  // Validate price snapshots are preserved
  TestValidator.equals("item 1 price snapshot", item1?.price, priceAtAddition1);
  TestValidator.equals("item 2 price snapshot", item2?.price, priceAtAddition2);
  // Validate quantities
  TestValidator.equals("item 1 quantity", item1?.quantity, 2);
  TestValidator.equals("item 2 quantity", item2?.quantity, 3);
  // Validate cart total calculation
  const calculatedTotal =
    (item1?.price ?? 0) * (item1?.quantity ?? 0) +
    (item2?.price ?? 0) * (item2?.quantity ?? 0);
  TestValidator.predicate("cart total is positive", calculatedTotal > 0);
  // 9. Verify that unavailable items are not included
  // All items in cart should be available
  for (const item of retrievedCart.cart_items) {
    TestValidator.predicate(
      `item ${item.id} variant is active`,
      item.variant.isActive === true,
    );
    TestValidator.predicate(
      `item ${item.id} variant has stock`,
      item.variant.stockQuantity > 0,
    );
  }
}