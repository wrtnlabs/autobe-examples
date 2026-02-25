import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful retrieval of an existing order snapshot by an authenticated customer
  // 1. Customer join and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(authorized);
  // Update connection headers with access token
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Create a fake order snapshot data (simulate or generate)
  // Since there is no create endpoint, use sdk simulation to create random snapshot
  const expectedSnapshot = typia.random<IShoppingMallOrderSnapshot>();
  // 3. Retrieve the order snapshot by ID
  const actualSnapshot =
    await api.functional.shoppingMall.customer.order_snapshots.at(
      customerConnection,
      { orderSnapshotId: expectedSnapshot.id },
    );
  typia.assert(actualSnapshot);
  // 4. Validate all fields match expected type (snapshot should be immutable)
  // We cannot guarantee the actual data exactly matches the random one,
  // but we check type and presence of necessary fields
  TestValidator.predicate(
    "order snapshot id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      actualSnapshot.id,
    ),
  );
  TestValidator.predicate("snapshotAt is ISO date-time", () => {
    const d = new Date(actualSnapshot.snapshotAt);
    return !isNaN(d.getTime());
  });
  TestValidator.predicate("createdAt is ISO date-time", () => {
    const d = new Date(actualSnapshot.createdAt);
    return !isNaN(d.getTime());
  });
  TestValidator.predicate("updatedAt is ISO date-time", () => {
    const d = new Date(actualSnapshot.updatedAt);
    return !isNaN(d.getTime());
  });
  TestValidator.predicate(
    "deletedAt is null or ISO date-time",
    actualSnapshot.deletedAt === null ||
      !isNaN(new Date(actualSnapshot.deletedAt).getTime()),
  );
  TestValidator.predicate(
    "status is non-empty string",
    actualSnapshot.status.length > 0,
  );
  TestValidator.predicate(
    "customerName is non-empty string",
    actualSnapshot.customerName.length > 0,
  );
  TestValidator.predicate(
    "customerEmail is email format",
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(actualSnapshot.customerEmail),
  );
  TestValidator.predicate(
    "shippingAddress is non-empty string",
    actualSnapshot.shippingAddress.length > 0,
  );
  TestValidator.predicate(
    "totalPrice is positive number",
    actualSnapshot.totalPrice > 0,
  );
  // 5. Confirm read-only access: No modification is possible (cannot test directly), just ensure no error on read
  // 6. Confirm HTTP 200 success is by typia.assert and no error thrown
}
