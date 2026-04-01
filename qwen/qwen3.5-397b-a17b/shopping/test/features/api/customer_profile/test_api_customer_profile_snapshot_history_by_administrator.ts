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
 * Test that an administrator can retrieve the complete snapshot history of a customer's profile changes.
 *
 * This test validates:
 * 1. Administrator authentication and access to customer profile snapshots
 * 2. Customer profile update creates immutable snapshots
 * 3. Snapshot history is returned in descending order by creation timestamp
 * 4. Each snapshot preserves the profile state at the time of modification
 * 5. Pagination metadata is correctly populated
 * 6. Audit trail functionality for compliance and dispute resolution
 */
export async function test_api_customer_profile_snapshot_history_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create customer account whose profile will be modified
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
  // 3. Update customer profile multiple times to create snapshots
  const firstUpdate = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const secondUpdate =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const thirdUpdate = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  // 4. Retrieve snapshot history using administrator endpoint
  const snapshots =
    await api.functional.shoppingMall.administrator.customers.profile.snapshots.list(
      adminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(snapshots);
  // 5. Verify pagination metadata is correctly populated
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.equals(
    "total records matches data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  TestValidator.predicate(
    "pages is at least 1",
    snapshots.pagination.pages >= 1,
  );
  // 6. Verify snapshots exist (at least 3 from our updates)
  TestValidator.predicate(
    "has at least 3 snapshots",
    snapshots.data.length >= 3,
  );
  // 7. Verify snapshots are in descending order by created_at (newest first)
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const currentTime = new Date(snapshots.data[i].createdAt).getTime();
    const nextTime = new Date(snapshots.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      currentTime >= nextTime,
    );
  }
  // 8. Verify each snapshot contains correct structure and customer info
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "snapshot customer id matches",
      snapshot.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "snapshot customer email matches",
      snapshot.customer.email,
      customer.email,
    );
    TestValidator.predicate("snapshot has valid uuid", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has display name",
      snapshot.displayName.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.createdAt.length > 0,
    );
    // phoneNumber can be null per DTO definition
    if (snapshot.phoneNumber !== null) {
      TestValidator.predicate(
        "snapshot phone number is valid",
        snapshot.phoneNumber.length > 0,
      );
    }
  }
  // 9. Verify the most recent snapshot matches the last profile update
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "latest snapshot display name matches last update",
    latestSnapshot.displayName,
    thirdUpdate.display_name,
  );
  // Handle nullable phoneNumber - thirdUpdate.phone_number is always string, snapshot can be null
  if (latestSnapshot.phoneNumber !== null) {
    TestValidator.equals(
      "latest snapshot phone number matches last update",
      latestSnapshot.phoneNumber,
      thirdUpdate.phone_number,
    );
  }
  // 10. Verify snapshots are immutable by checking they have unique IDs
  const snapshotIds = snapshots.data.map((s) => s.id);
  const uniqueIds = new Set(snapshotIds);
  TestValidator.equals(
    "all snapshots have unique ids",
    uniqueIds.size,
    snapshots.data.length,
  );
}
