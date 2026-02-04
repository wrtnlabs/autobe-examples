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
export async function test_api_cart_item_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/join",
      referrer: "https://referral.example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Create a product variant in cart - this will generate stats
  const createdCartItem =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(createdCartItem);
  // Step 3: Get the analytics summary for cart items
  const analyticsSummary =
    await api.functional.shoppingMall.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(analyticsSummary);
  // Step 4: Validate the analytics summary properties exist and have valid values
  TestValidator.predicate(
    "total abandoned carts is non-negative",
    analyticsSummary.totalAbandonedCarts >= 0,
  );
  TestValidator.predicate(
    "average cart value is non-negative",
    analyticsSummary.averageCartValue >= 0,
  );
  TestValidator.predicate(
    "abandonment rate is between 0 and 1",
    analyticsSummary.abandonmentRate >= 0 &&
      analyticsSummary.abandonmentRate <= 1,
  );
  TestValidator.predicate(
    "average time to abandonment is non-negative",
    analyticsSummary.averageTimeToAbandonment >= 0,
  );
}
