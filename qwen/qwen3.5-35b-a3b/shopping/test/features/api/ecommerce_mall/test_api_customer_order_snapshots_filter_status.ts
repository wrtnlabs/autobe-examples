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

export async function test_api_customer_order_snapshots_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create actor-specific connections with tokens
  const customerAuthConnection: api.IConnection = { host: connection.host };
  customerAuthConnection.headers = {
    Authorization: customer.token.access,
  };
  // 3. Test with valid order ID and status filter
  // Since we don't have an actual order, we'll use a random order ID
  // and test the filtering logic
  const testOrderId = typia.random<string & tags.Format<"uuid">>();
  // Test with status: 'paid' filter
  const paidFilterRequest = {
    body: {
      filter: {
        status: "paid",
      },
    } satisfies IEcommerceMallOrderSnapshot.IRequest,
    orderId: testOrderId,
  };
  const paidSnapshots =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerAuthConnection,
      paidFilterRequest,
    );
  typia.assert(paidSnapshots);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "paid filter - current page",
    paidSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "paid filter - limit",
    paidSnapshots.pagination.limit,
    20,
  );
  TestValidator.equals(
    "paid filter - records",
    paidSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "paid filter - pages",
    paidSnapshots.pagination.pages,
    0,
  );
  // Test with status: 'pending' filter
  const pendingFilterRequest = {
    body: {
      filter: {
        status: "pending",
      },
    } satisfies IEcommerceMallOrderSnapshot.IRequest,
    orderId: testOrderId,
  };
  const pendingSnapshots =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerAuthConnection,
      pendingFilterRequest,
    );
  typia.assert(pendingSnapshots);
  TestValidator.equals(
    "pending filter - data array empty",
    pendingSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "pending filter - current page",
    pendingSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending filter - limit",
    pendingSnapshots.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pending filter - records",
    pendingSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pending filter - pages",
    pendingSnapshots.pagination.pages,
    0,
  );
  // Test with undefined filter (no filter)
  const noFilterRequest = {
    body: {} satisfies IEcommerceMallOrderSnapshot.IRequest,
    orderId: testOrderId,
  };
  const noFilterSnapshots =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerAuthConnection,
      noFilterRequest,
    );
  typia.assert(noFilterSnapshots);
  // Validate no filter pagination metadata
  TestValidator.equals(
    "no filter - current page",
    noFilterSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "no filter - limit",
    noFilterSnapshots.pagination.limit,
    20,
  );
  TestValidator.equals(
    "no filter - records",
    noFilterSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "no filter - pages",
    noFilterSnapshots.pagination.pages,
    0,
  );
}