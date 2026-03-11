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

export async function test_api_cart_summary_price_snapshot_persistence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Update connection with customer token
  customerConnection.headers = {
    Authorization: customerAuth.token.access,
  };
  // 2. Create shopping cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Add first product variant to cart
  const variantId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const firstItemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >() satisfies number;
  const firstCartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variantId1,
          quantity: firstItemQuantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // Record the initial price captured at addition time
  const initialPrice1 = firstCartItem.price;
  // 4. Add second product variant to cart with different price
  const variantId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const secondItemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >() satisfies number;
  const secondCartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variantId2,
          quantity: secondItemQuantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // Record the initial price captured at addition time
  const initialPrice2 = secondCartItem.price;
  // 5. Get cart summary and verify price snapshots
  const cartSummary = await api.functional.ecommerceMall.customer.cart.summary(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallShoppingCart.IRequest,
    },
  );
  typia.assert(cartSummary);
  // Extract cart items from summary
  const cartItemsSummary: IEcommerceMallCartItem.ISummary[] =
    cartSummary.data[0]?.cartItems ?? [];
  TestValidator.equals(
    "cart summary has two items",
    cartItemsSummary.length,
    2,
  );
  // Find items by variant_id and verify prices
  const firstSummaryItem = cartItemsSummary.find(
    (item) => item.variant.id === variantId1,
  );
  const secondSummaryItem = cartItemsSummary.find(
    (item) => item.variant.id === variantId2,
  );
  TestValidator.predicate(
    "first item exists in summary",
    firstSummaryItem !== undefined,
  );
  TestValidator.predicate(
    "second item exists in summary",
    secondSummaryItem !== undefined,
  );
  // Verify price snapshots are preserved
  TestValidator.equals(
    "first item price snapshot preserved",
    firstSummaryItem?.price,
    initialPrice1,
  );
  TestValidator.equals(
    "second item price snapshot preserved",
    secondSummaryItem?.price,
    initialPrice2,
  );
  // 6. Verify cart totals are calculated using snapshot prices
  const expectedSubtotal =
    initialPrice1 * firstItemQuantity + initialPrice2 * secondItemQuantity;
  const expectedTax = expectedSubtotal * 0.1; // 10% tax
  const expectedTotal = expectedSubtotal + expectedTax;
  const summary = cartSummary.data[0];
  TestValidator.equals(
    "cart subtotal matches snapshot prices",
    summary.subtotal,
    expectedSubtotal,
  );
  TestValidator.equals(
    "cart tax matches snapshot prices",
    summary.tax,
    expectedTax,
  );
  TestValidator.equals(
    "cart total matches snapshot prices",
    summary.total,
    expectedTotal,
  );
  // 7. Retrieve cart summary again to verify immutability
  const cartSummary2 = await api.functional.ecommerceMall.customer.cart.summary(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallShoppingCart.IRequest,
    },
  );
  typia.assert(cartSummary2);
  const cartItemsSummary2: IEcommerceMallCartItem.ISummary[] =
    cartSummary2.data[0]?.cartItems ?? [];
  const firstSummaryItem2 = cartItemsSummary2.find(
    (item) => item.variant.id === variantId1,
  );
  const secondSummaryItem2 = cartItemsSummary2.find(
    (item) => item.variant.id === variantId2,
  );
  // Verify price snapshots remain unchanged after second retrieval
  TestValidator.equals(
    "first item price immutable after second retrieval",
    firstSummaryItem2?.price,
    initialPrice1,
  );
  TestValidator.equals(
    "second item price immutable after second retrieval",
    secondSummaryItem2?.price,
    initialPrice2,
  );
}