import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test administrator's ability to filter shopping carts by deletion status.
 *
 * This test validates that administrators can properly filter shopping carts
 * based on their soft-delete status (deleted_at field). The test creates
 * multiple customer accounts with carts, then verifies that the filtering
 * mechanism correctly separates active carts from soft-deleted ones.
 *
 * Test Flow:
 * 1. Administrator joins and authenticates
 * 2. Create multiple customer accounts
 * 3. Each customer adds items to their cart (creating active carts)
 * 4. Administrator queries carts with deleted_at=null (active only)
 * 5. Administrator queries carts without filter (should return active only by default)
 * 6. Verify all returned carts have deleted_at=null
 * 7. Verify cart data integrity (customer info, item counts, totals)
 */
export async function test_api_administrator_cart_filter_deleted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple customer accounts with carts
  const customerConnections: api.IConnection[] = [];
  const customerAuths: IShoppingMallCustomer.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customerAuth);
    customerConnections.push(customerConnection);
    customerAuths.push(customerAuth);
    // 3. Add items to each customer's cart
    // Note: generate_random_shopping_mall_customer_cart_items_create handles
    // product variant preparation internally
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  }
  // 4. Administrator queries carts with deleted_at=null (active carts only)
  const activeCartsResult =
    await api.functional.shoppingMall.administrator.carts.index(
      adminConnection,
      {
        body: {
          deleted_at: null,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCart.IRequest,
      },
    );
  typia.assert(activeCartsResult);
  // 5. Verify all returned carts are active (deleted_at is null)
  TestValidator.predicate("all carts are active", () =>
    activeCartsResult.data.every((cart) => cart.deleted_at === null),
  );
  // 6. Verify we have carts from our test customers
  TestValidator.predicate(
    "has test customer carts",
    () => activeCartsResult.data.length >= 3,
  );
  // 7. Administrator queries carts without deleted_at filter (default should be active)
  const defaultCartsResult =
    await api.functional.shoppingMall.administrator.carts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCart.IRequest,
      },
    );
  typia.assert(defaultCartsResult);
  // 8. Verify default query also returns only active carts
  TestValidator.predicate("default query returns active carts", () =>
    defaultCartsResult.data.every((cart) => cart.deleted_at === null),
  );
  // 9. Verify cart data integrity - business logic validations
  for (const cart of activeCartsResult.data) {
    // Verify cart metadata (business logic, not type - typia.assert handles types)
    TestValidator.predicate(
      "items count is non-negative",
      () => cart.items_count >= 0,
    );
    TestValidator.predicate(
      "total amount is non-negative",
      () => cart.total_amount >= 0,
    );
  }
  // 10. Query carts filtered by specific customer
  if (customerAuths.length > 0) {
    const customerSpecificCarts =
      await api.functional.shoppingMall.administrator.carts.index(
        adminConnection,
        {
          body: {
            customer_id: customerAuths[0].id,
            deleted_at: null,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallCart.IRequest,
        },
      );
    typia.assert(customerSpecificCarts);
    // Verify all carts belong to the specified customer
    TestValidator.predicate("all carts belong to specified customer", () =>
      customerSpecificCarts.data.every(
        (cart) => cart.customer.id === customerAuths[0].id,
      ),
    );
  }
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => activeCartsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () =>
      activeCartsResult.pagination.limit >= 1 &&
      activeCartsResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count matches data",
    () => activeCartsResult.pagination.records >= activeCartsResult.data.length,
  );
}
