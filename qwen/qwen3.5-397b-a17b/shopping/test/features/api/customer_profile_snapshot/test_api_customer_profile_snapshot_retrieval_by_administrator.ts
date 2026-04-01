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

export async function test_api_customer_profile_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Update customer profile to create a snapshot
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Retrieve list of customer profile snapshots as administrator
  const snapshotsPage =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // Verify we have at least one snapshot
  TestValidator.predicate("has snapshots", snapshotsPage.data.length > 0);
  // Get the first snapshot ID
  const snapshotId = snapshotsPage.data[0]!.id;
  // 5. Retrieve the specific snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot structure
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "customer ID matches",
    snapshot.customer.id,
    customer.id,
  );
  TestValidator.predicate("has display name", snapshot.displayName.length > 0);
  TestValidator.predicate(
    "has createdAt timestamp",
    snapshot.createdAt.length > 0,
  );
  // 7. Verify snapshot data matches the profile state at update time
  TestValidator.equals(
    "display name matches",
    snapshot.displayName,
    updatedProfile.display_name,
  );
  TestValidator.equals(
    "phone number matches",
    snapshot.phoneNumber,
    updatedProfile.phone_number,
  );
  // 8. Update profile again to verify snapshot immutability
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
  // Retrieve the same snapshot again and verify it's unchanged
  const snapshotAgain =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshotAgain);
  // Verify snapshot is immutable - should still have original values
  TestValidator.equals(
    "snapshot immutable - displayName",
    snapshotAgain.displayName,
    snapshot.displayName,
  );
  TestValidator.equals(
    "snapshot immutable - phoneNumber",
    snapshotAgain.phoneNumber,
    snapshot.phoneNumber,
  );
  TestValidator.notEquals(
    "current profile changed",
    secondUpdate.display_name,
    snapshot.displayName,
  );
}
