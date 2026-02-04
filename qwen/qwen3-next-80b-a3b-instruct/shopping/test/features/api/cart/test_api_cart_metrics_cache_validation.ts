import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { generate_random_shopping_mall_customer_cart_items_index } from "../../../generate/generate_random_shopping_mall_customer_cart_items_index";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_cart_metrics_cache_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 2: Create first cart item
  // We need a valid product variant - use a known good pattern
  const firstVariantId: string = typia.random<string & tags.Format<"uuid">>();
  const firstItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_cart_items_index(
      customerConnection,
      {
        body: {
          variantId: firstVariantId,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  // Step 3: First metrics request - establishes cache
  const firstMetrics: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.me.metrics.meMetrics(
      customerConnection,
    );
  typia.assert(firstMetrics);
  // Step 4: Validate first metrics have correct values based on cart state
  TestValidator.equals(
    "total cart items should be 2",
    firstMetrics.totalAbandonedCarts,
    1,
  );
  TestValidator.predicate(
    "average cart value should be > 0",
    firstMetrics.averageCartValue > 0,
  );
  TestValidator.predicate(
    "abandonment rate should be between 0 and 1",
    firstMetrics.abandonmentRate >= 0 && firstMetrics.abandonmentRate <= 1,
  );
  TestValidator.predicate(
    "average time to abandonment should be >= 0",
    firstMetrics.averageTimeToAbandonment >= 0,
  );
  // Step 5: Second metrics request - should hit cache
  const secondMetrics: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.me.metrics.meMetrics(
      customerConnection,
    );
  typia.assert(secondMetrics);
  // Step 6: Validate cache hit - values should be identical
  TestValidator.equals(
    "Second metrics request should return same cache values",
    firstMetrics,
    secondMetrics,
  );
  // Step 7: Add second cart item to invalidate cache
  const secondVariantId: string = typia.random<string & tags.Format<"uuid">>();
  const secondItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_cart_items_index(
      customerConnection,
      {
        body: {
          variantId: secondVariantId,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondItem);
  // Step 8: Third metrics request after change - should recalculate
  const thirdMetrics: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.me.metrics.meMetrics(
      customerConnection,
    );
  typia.assert(thirdMetrics);
  // Step 9: Verify cache was invalidated and recalculation occurred - different total items
  TestValidator.notEquals(
    "Third metrics should be different after cart modification",
    secondMetrics,
    thirdMetrics,
  );
  // Step 10: Validate recalculated metrics have correct values
  TestValidator.equals(
    "total cart items should be 2 unique products",
    thirdMetrics.totalAbandonedCarts,
    2,
  );
  TestValidator.predicate(
    "average cart value should be > 0",
    thirdMetrics.averageCartValue > 0,
  );
  TestValidator.predicate(
    "abandonment rate should be between 0 and 1",
    thirdMetrics.abandonmentRate >= 0 && thirdMetrics.abandonmentRate <= 1,
  );
  TestValidator.predicate(
    "average time to abandonment should be >= 0",
    thirdMetrics.averageTimeToAbandonment >= 0,
  );
  // Step 11: Final metrics request - should return updated cached values
  const finalMetrics: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.me.metrics.meMetrics(
      customerConnection,
    );
  typia.assert(finalMetrics);
  // Step 12: Verify final metrics match previous calculation
  TestValidator.equals(
    "Final metrics should match previous calculation",
    thirdMetrics,
    finalMetrics,
  );
}
