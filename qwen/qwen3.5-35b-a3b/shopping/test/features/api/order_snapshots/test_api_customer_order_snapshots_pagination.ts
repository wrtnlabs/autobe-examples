import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() as string & tags.Format<"uri">,
      ip: typia.random<string>() as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create actor-specific connection with token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 3. Create a test order (using random UUID as placeholder)
  const testOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Test pagination with different page and limit combinations
  // Test page=1, limit=10
  const page1Limit10 =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId: testOrderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 limit 10 - current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10 - records non-negative",
    page1Limit10.pagination.records >= 0,
  );
  TestValidator.equals(
    "page 1 limit 10 - pages calculated",
    page1Limit10.pagination.pages,
    Math.ceil(page1Limit10.pagination.records / 10),
  );
  // Test page=2, limit=10
  const page2Limit10 =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId: testOrderId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page2Limit10);
  TestValidator.equals(
    "page 2 limit 10 - current page",
    page2Limit10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 - limit",
    page2Limit10.pagination.limit,
    10,
  );
  // Test page=1, limit=50
  const page1Limit50 =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId: testOrderId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page1Limit50);
  TestValidator.equals(
    "page 1 limit 50 - current page",
    page1Limit50.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 50 - limit",
    page1Limit50.pagination.limit,
    50,
  );
  // Test page=1, limit=100
  const page1Limit100 =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId: testOrderId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "page 1 limit 100 - current page",
    page1Limit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 - limit",
    page1Limit100.pagination.limit,
    100,
  );
  // Test page=999 (beyond available pages)
  const page999Limit10 =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId: testOrderId,
        body: {
          page: 999,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page999Limit10);
  TestValidator.equals(
    "page 999 limit 10 - current page",
    page999Limit10.pagination.current,
    999,
  );
  TestValidator.equals(
    "page 999 limit 10 - limit",
    page999Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 999 limit 10 - data empty",
    page999Limit10.data,
    [],
  );
  // Test sort parameter - ascending order
  const sortAsc =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId: testOrderId,
        body: {
          sort: "created_at:asc",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(sortAsc);
  // Validate snapshots are in ascending order by created_at
  if (sortAsc.data.length > 1) {
    for (let i = 1; i < sortAsc.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i - 1} created_at (asc order)`,
        sortAsc.data[i].created_at >= sortAsc.data[i - 1].created_at,
      );
    }
  }
  // Validate snapshot data structure
  if (sortAsc.data.length > 0) {
    const firstSnapshot = sortAsc.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "entity_type is order",
      firstSnapshot.entity_type === "order",
    );
    TestValidator.predicate(
      "entity_id is valid uuid",
      typia.is<string & tags.Format<"uuid">>(firstSnapshot.entity_id),
    );
    TestValidator.predicate(
      "version is positive integer",
      firstSnapshot.version > 0,
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      typia.is<string & tags.Format<"date-time">>(firstSnapshot.created_at),
    );
    TestValidator.predicate(
      "actor is null or valid customer summary",
      firstSnapshot.actor === null ||
        (typeof firstSnapshot.actor === "object" &&
          typeof firstSnapshot.actor.id === "string" &&
          typeof firstSnapshot.actor.email === "string" &&
          typeof firstSnapshot.actor.status === "string" &&
          typeof firstSnapshot.actor.created_at === "string" &&
          (firstSnapshot.actor.deleted_at === null ||
            typeof firstSnapshot.actor.deleted_at === "string")),
    );
  }
}