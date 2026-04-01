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
 * Test customer profile snapshot audit trail with multiple updates.
 *
 * This test validates the complete snapshot workflow:
 * 1. Administrator registers and logs in
 * 2. Customer account is created with initial profile
 * 3. Multiple profile updates are performed to create snapshots
 * 4. All snapshots are retrieved and validated for chronological order
 * 5. Each snapshot is retrieved individually and verified for immutability
 * 6. Historical state preservation is confirmed across all snapshots
 */
export async function test_api_customer_profile_snapshot_audit_trail_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Create customer account with initial profile
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Store initial profile values
  const initialDisplayName = customerJoin.profile.display_name;
  const initialPhoneNumber = customerJoin.profile.phone_number;
  // 3. Perform multiple profile updates to create snapshots
  // Update 1: Change display name only
  const update1DisplayName = RandomGenerator.name();
  const profileUpdate1 =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: update1DisplayName,
          phone_number: initialPhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(profileUpdate1);
  // Update 2: Change phone number only
  const update2PhoneNumber = RandomGenerator.mobile();
  const profileUpdate2 =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: update1DisplayName,
          phone_number: update2PhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(profileUpdate2);
  // Update 3: Change both display name and phone number
  const update3DisplayName = RandomGenerator.name();
  const update3PhoneNumber = RandomGenerator.mobile();
  const profileUpdate3 =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: update3DisplayName,
          phone_number: update3PhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(profileUpdate3);
  // 4. Retrieve all snapshots for the customer
  const snapshotsResponse =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Verify multiple snapshots were created
  TestValidator.predicate(
    "multiple snapshots exist",
    () => snapshotsResponse.data.length >= 3,
  );
  TestValidator.predicate(
    "pagination has records",
    () => snapshotsResponse.pagination.records >= 3,
  );
  // 5. Validate snapshot chronological order and uniqueness
  const snapshots = snapshotsResponse.data;
  const snapshotIds = new Set<string>();
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    // Verify unique IDs
    TestValidator.predicate(
      "snapshot ID is unique",
      () => !snapshotIds.has(snapshot.id),
    );
    snapshotIds.add(snapshot.id);
    // Verify createdAt timestamp exists and is valid
    TestValidator.predicate("createdAt is valid date-time", () => {
      const date = new Date(snapshot.createdAt);
      return !isNaN(date.getTime());
    });
  }
  // Verify chronological order (newest first based on API spec)
  if (snapshots.length >= 2) {
    const firstCreatedAt = new Date(snapshots[0].createdAt).getTime();
    const lastCreatedAt = new Date(
      snapshots[snapshots.length - 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "snapshots ordered by createdAt DESC",
      () => firstCreatedAt >= lastCreatedAt,
    );
  }
  // 6. Retrieve each snapshot individually and validate historical state
  for (const snapshotSummary of snapshots) {
    const snapshotDetail =
      await api.functional.shoppingMall.administrator.customers.profiles.snapshots.at(
        adminLoginConnection,
        {
          snapshotId: snapshotSummary.id,
        },
      );
    typia.assert(snapshotDetail);
    // Verify snapshot detail matches summary
    TestValidator.equals(
      "snapshot ID matches",
      snapshotDetail.id,
      snapshotSummary.id,
    );
    TestValidator.equals(
      "displayName matches",
      snapshotDetail.displayName,
      snapshotSummary.displayName,
    );
    TestValidator.equals(
      "phoneNumber matches",
      snapshotDetail.phoneNumber,
      snapshotSummary.phoneNumber,
    );
    TestValidator.equals(
      "createdAt matches",
      snapshotDetail.createdAt,
      snapshotSummary.createdAt,
    );
    // Verify customer reference
    TestValidator.equals(
      "customer ID matches",
      snapshotDetail.customer.id,
      customerJoin.id,
    );
    TestValidator.equals(
      "customer email matches",
      snapshotDetail.customer.email,
      customerJoin.email,
    );
    // Verify snapshot preserves historical values (not current profile values)
    TestValidator.predicate(
      "snapshot has historical displayName",
      () =>
        snapshotDetail.displayName === initialDisplayName ||
        snapshotDetail.displayName === update1DisplayName ||
        snapshotDetail.displayName === update3DisplayName,
    );
    TestValidator.predicate(
      "snapshot has historical phoneNumber",
      () =>
        snapshotDetail.phoneNumber === initialPhoneNumber ||
        snapshotDetail.phoneNumber === update2PhoneNumber ||
        snapshotDetail.phoneNumber === update3PhoneNumber,
    );
  }
}
