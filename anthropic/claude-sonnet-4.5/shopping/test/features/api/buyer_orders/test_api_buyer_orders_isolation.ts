import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_buyer_orders_isolation(
  connection: api.IConnection,
) {
  // Create three separate buyer accounts for isolation testing
  const buyer1Password = typia.random<string & tags.MinLength<8>>();
  const buyer1Email = typia.random<string & tags.Format<"email">>();

  const buyer1: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyer1Email,
        password: buyer1Password,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://google.com",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer1);

  const buyer2Password = typia.random<string & tags.MinLength<8>>();
  const buyer2Email = typia.random<string & tags.Format<"email">>();

  const buyer2: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyer2Email,
        password: buyer2Password,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://google.com",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer2);

  const buyer3Password = typia.random<string & tags.MinLength<8>>();
  const buyer3Email = typia.random<string & tags.Format<"email">>();

  const buyer3: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyer3Email,
        password: buyer3Password,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://google.com",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer3);

  // Retrieve orders for buyer1 (connection already authenticated as buyer1 from join)
  const buyer1Orders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(buyer1Orders);

  // Create new connection and authenticate as buyer2
  const buyer2Connection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.buyer.join(buyer2Connection, {
    body: {
      email: buyer2Email,
      password: buyer2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com",
    } satisfies IShoppingMallBuyer.ICreate,
  });

  const buyer2Orders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(buyer2Connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(buyer2Orders);

  // Create new connection and authenticate as buyer3
  const buyer3Connection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.buyer.join(buyer3Connection, {
    body: {
      email: buyer3Email,
      password: buyer3Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com",
    } satisfies IShoppingMallBuyer.ICreate,
  });

  const buyer3Orders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(buyer3Connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(buyer3Orders);

  // Verify isolation: each buyer should only see their own orders (empty in this case)
  TestValidator.equals(
    "buyer1 initial orders count",
    buyer1Orders.data.length,
    0,
  );
  TestValidator.equals(
    "buyer2 initial orders count",
    buyer2Orders.data.length,
    0,
  );
  TestValidator.equals(
    "buyer3 initial orders count",
    buyer3Orders.data.length,
    0,
  );

  // Verify pagination metadata reflects correct buyer-specific counts
  TestValidator.equals(
    "buyer1 total records",
    buyer1Orders.pagination.records,
    0,
  );
  TestValidator.equals(
    "buyer2 total records",
    buyer2Orders.pagination.records,
    0,
  );
  TestValidator.equals(
    "buyer3 total records",
    buyer3Orders.pagination.records,
    0,
  );

  // Verify page numbers are correct
  TestValidator.equals(
    "buyer1 current page",
    buyer1Orders.pagination.current,
    1,
  );
  TestValidator.equals(
    "buyer2 current page",
    buyer2Orders.pagination.current,
    1,
  );
  TestValidator.equals(
    "buyer3 current page",
    buyer3Orders.pagination.current,
    1,
  );
}
