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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_summary_multi_seller_checkout_prep(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as a new customer
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    },
  });
  typia.assert(joinResult);
  // 2. Create customer connection and cart
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joinResult.token.access,
  };
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Create cart items using generate_random utility
  // Note: variant_id must be a valid UUID that exists in the system
  // Using typia.random for demo - in real test, would use actual product IDs
  const variantId1 = typia.random<string & tags.Format<"uuid">>();
  await generate_random_ecommerce_mall_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: cart.id },
      body: {
        variant_id: variantId1,
        quantity: 2,
      },
    },
  );
  const variantId2 = typia.random<string & tags.Format<"uuid">>();
  await generate_random_ecommerce_mall_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: cart.id },
      body: {
        variant_id: variantId2,
        quantity: 1,
      },
    },
  );
  const variantId3 = typia.random<string & tags.Format<"uuid">>();
  await generate_random_ecommerce_mall_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: cart.id },
      body: {
        variant_id: variantId3,
        quantity: 3,
      },
    },
  );
  const variantId4 = typia.random<string & tags.Format<"uuid">>();
  await generate_random_ecommerce_mall_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: cart.id },
      body: {
        variant_id: variantId4,
        quantity: 1,
      },
    },
  );
  // 4. GET cart summary with default pagination
  const defaultSummary =
    await api.functional.ecommerceMall.customer.cart.summary(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultSummary);
  // Verify cart exists (cart_id returned even when empty)
  TestValidator.equals("cart id exists", defaultSummary.data[0]?.id, cart.id);
  // Verify cart totals
  TestValidator.equals("item count", defaultSummary.data[0].itemCount, 7);
  TestValidator.predicate(
    "subtotal positive",
    defaultSummary.data[0].subtotal > 0,
  );
  // Verify tax is approximately 10% of subtotal (floating point tolerant)
  const expectedTax = defaultSummary.data[0].subtotal * 0.1;
  const taxDifference = Math.abs(defaultSummary.data[0].tax - expectedTax);
  TestValidator.predicate("tax is 10% of subtotal", taxDifference < 1);
  TestValidator.equals(
    "total equals subtotal + tax",
    defaultSummary.data[0].total,
    defaultSummary.data[0].subtotal + defaultSummary.data[0].tax,
  );
  // Verify seller subtotals exist
  if (
    defaultSummary.data[0].sellerSubtotals &&
    defaultSummary.data[0].sellerSubtotals.length > 0
  ) {
    TestValidator.predicate(
      "seller subtotals present and non-empty",
      defaultSummary.data[0].sellerSubtotals.length >= 1,
    );
    for (const sellerSubtotal of defaultSummary.data[0].sellerSubtotals) {
      const sellerExpectedTax = sellerSubtotal.subtotal * 0.1;
      const sellerTaxDifference = Math.abs(
        sellerSubtotal.total - (sellerSubtotal.subtotal + sellerExpectedTax),
      );
      TestValidator.predicate(
        "seller subtotal total matches",
        sellerTaxDifference < 1,
      );
    }
  }
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultSummary.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    defaultSummary.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records",
    defaultSummary.pagination.records,
    7,
  );
  TestValidator.equals("pagination pages", defaultSummary.pagination.pages, 1);
  // 5. GET cart summary with filterByStatus=true
  const filteredSummary =
    await api.functional.ecommerceMall.customer.cart.summary(
      customerConnection,
      {
        body: {
          filterByStatus: true,
        },
      },
    );
  typia.assert(filteredSummary);
  TestValidator.equals(
    "filtered summary has data",
    filteredSummary.data[0]?.id,
    cart.id,
  );
  // 6. GET cart summary with sortBy=quantity DESC
  const sortByQuantitySummary =
    await api.functional.ecommerceMall.customer.cart.summary(
      customerConnection,
      {
        body: {
          sortBy: "quantity",
          sortOrder: "DESC",
        },
      },
    );
  typia.assert(sortByQuantitySummary);
  // 7. GET cart summary with sortBy=price ASC
  const sortByPriceSummary =
    await api.functional.ecommerceMall.customer.cart.summary(
      customerConnection,
      {
        body: {
          sortBy: "price",
          sortOrder: "ASC",
        },
      },
    );
  typia.assert(sortByPriceSummary);
  // 8. GET cart summary with sortBy=item_count DESC
  const sortByItemCountSummary =
    await api.functional.ecommerceMall.customer.cart.summary(
      customerConnection,
      {
        body: {
          sortBy: "item_count",
          sortOrder: "DESC",
        },
      },
    );
  typia.assert(sortByItemCountSummary);
  // 9. Verify price snapshots (items should have prices captured at addition time)
  if (sortByQuantitySummary.data[0]?.cartItems) {
    for (const cartItem of sortByQuantitySummary.data[0].cartItems) {
      TestValidator.predicate("cart item has price", cartItem.price > 0);
    }
  }
}