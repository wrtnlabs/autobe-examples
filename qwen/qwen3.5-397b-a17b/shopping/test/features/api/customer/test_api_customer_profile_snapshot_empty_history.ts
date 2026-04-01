import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfileSnapshot";
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

/**
 * Test that an administrator can retrieve snapshot history for a customer who has never modified their profile.
 *
 * This test validates the edge case where a customer has just registered without making any profile updates.
 * The snapshot history should return an empty data array with pagination metadata showing zero records.
 *
 * Steps:
 * 1. Create and authenticate an administrator account
 * 2. Create a new customer account without making any profile updates
 * 3. Retrieve the snapshot history using the administrator endpoint
 * 4. Verify the response returns an empty data array
 * 5. Verify pagination metadata shows zero records
 */
export async function test_api_customer_profile_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create a new customer account without making any profile updates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Retrieve the snapshot history using the administrator endpoint
  const snapshotHistory =
    await api.functional.shoppingMall.administrator.customers.profile.snapshots.list(
      adminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(snapshotHistory);
  // 4. Verify the response returns an empty data array
  TestValidator.equals(
    "snapshot history should be empty for new customer",
    snapshotHistory.data,
    [],
  );
  // 5. Verify pagination metadata shows zero records
  TestValidator.equals(
    "pagination current page",
    snapshotHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    snapshotHistory.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages",
    snapshotHistory.pagination.pages,
    0,
  );
}
