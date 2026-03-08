import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_snapshot_view_basic(
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
  // 2. Query snapshots with default pagination
  const snapshotResponse: IPageIEcommerceMallOrderItemSnapshot.ISummary =
    await api.functional.ecommerceMall.customer.orderItemSnapshots.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(snapshotResponse);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.equals("page limit", snapshotResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    snapshotResponse.pagination.pages >= 0,
  );
  // 4. Validate snapshots are an array
  TestValidator.predicate(
    "data is array",
    Array.isArray(snapshotResponse.data),
  );
  // 5. Validate snapshot structure (if any exist)
  if (snapshotResponse.data.length > 0) {
    const snapshot = snapshotResponse.data[0];
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has old_status",
      snapshot.old_status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has new_status",
      snapshot.new_status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
  }
}