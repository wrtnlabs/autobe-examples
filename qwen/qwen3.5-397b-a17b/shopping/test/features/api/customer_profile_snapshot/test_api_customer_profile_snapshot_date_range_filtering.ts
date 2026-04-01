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
 * Test that an administrator can filter customer profile snapshots by date range.
 *
 * This test verifies:
 * 1. Administrator can access customer profile snapshot history
 * 2. Date range filtering correctly includes/excludes snapshots based on created_at
 * 3. Pagination metadata reflects filtered results
 * 4. Snapshots are returned in descending order by created_at
 * 5. Boundary conditions (exact created_at_from and created_at_to) are handled correctly
 */
export async function test_api_customer_profile_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Setup: Register customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Customer updates profile multiple times to create snapshots
  // First update: Change display name and phone
  const firstName = RandomGenerator.name();
  const firstPhone = RandomGenerator.mobile();
  await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: firstName,
        phone_number: firstPhone,
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    },
  );
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second update: Change phone number
  const secondName = RandomGenerator.name();
  const secondPhone = RandomGenerator.mobile();
  await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: secondName,
        phone_number: secondPhone,
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    },
  );
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Third update: Change display name again
  const thirdName = RandomGenerator.name();
  const thirdPhone = RandomGenerator.mobile();
  await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: thirdName,
        phone_number: thirdPhone,
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    },
  );
  // 4. Administrator retrieves all snapshots first to get baseline
  const allSnapshots =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify we have at least 3 snapshots from our updates
  TestValidator.predicate(
    "has at least 3 snapshots",
    () => allSnapshots.data.length >= 3,
  );
  // 5. Test date range filtering - get timestamps from snapshots
  const snapshots = allSnapshots.data;
  const oldestSnapshot = snapshots[snapshots.length - 1];
  const newestSnapshot = snapshots[0];
  // Test 1: Filter with created_at_from (exclude older snapshots)
  const fromDate = new Date(oldestSnapshot.createdAt);
  fromDate.setMilliseconds(fromDate.getMilliseconds() + 50); // Skip the oldest
  const filteredFromResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: fromDate.toISOString(),
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(filteredFromResult);
  TestValidator.predicate(
    "from filter excludes older snapshots",
    () => filteredFromResult.data.length < allSnapshots.data.length,
  );
  TestValidator.predicate("from filter maintains descending order", () => {
    for (let i = 1; i < filteredFromResult.data.length; i++) {
      if (
        new Date(filteredFromResult.data[i].createdAt) >
        new Date(filteredFromResult.data[i - 1].createdAt)
      ) {
        return false;
      }
    }
    return true;
  });
  // Test 2: Filter with created_at_to (exclude newer snapshots)
  const toDate = new Date(newestSnapshot.createdAt);
  toDate.setMilliseconds(toDate.getMilliseconds() - 50); // Skip the newest
  const filteredToResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_to: toDate.toISOString(),
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(filteredToResult);
  TestValidator.predicate(
    "to filter excludes newer snapshots",
    () => filteredToResult.data.length < allSnapshots.data.length,
  );
  // Test 3: Filter with both created_at_from and created_at_to (range filter)
  const rangeFromDate = new Date(oldestSnapshot.createdAt);
  rangeFromDate.setMilliseconds(rangeFromDate.getMilliseconds() + 25);
  const rangeToDate = new Date(newestSnapshot.createdAt);
  rangeToDate.setMilliseconds(rangeToDate.getMilliseconds() - 25);
  const rangeFilteredResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: rangeFromDate.toISOString(),
          created_at_to: rangeToDate.toISOString(),
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(rangeFilteredResult);
  TestValidator.predicate(
    "range filter returns subset",
    () => rangeFilteredResult.data.length <= allSnapshots.data.length,
  );
  // Test 4: Verify pagination metadata is correct for filtered results
  TestValidator.equals(
    "pagination current page",
    rangeFilteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    () =>
      rangeFilteredResult.pagination.records ===
      rangeFilteredResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      rangeFilteredResult.pagination.pages ===
      Math.ceil(
        rangeFilteredResult.pagination.records /
          rangeFilteredResult.pagination.limit,
      ),
  );
  // Test 5: Boundary test - exact created_at_from should include that snapshot
  const exactFromResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: oldestSnapshot.createdAt,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(exactFromResult);
  TestValidator.predicate("exact from boundary includes oldest snapshot", () =>
    exactFromResult.data.some((s) => s.createdAt === oldestSnapshot.createdAt),
  );
  // Test 6: Boundary test - exact created_at_to should include that snapshot
  const exactToResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_to: newestSnapshot.createdAt,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(exactToResult);
  TestValidator.predicate("exact to boundary includes newest snapshot", () =>
    exactToResult.data.some((s) => s.createdAt === newestSnapshot.createdAt),
  );
}
