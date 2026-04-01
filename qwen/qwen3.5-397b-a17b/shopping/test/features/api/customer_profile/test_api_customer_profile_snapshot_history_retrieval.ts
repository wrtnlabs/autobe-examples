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

export async function test_api_customer_profile_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // 2. Customer setup - register account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCredentials = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Customer updates profile multiple times to create snapshots
  const profileUpdates = ArrayUtil.repeat(3, (index) => ({
    display_name: `Customer Name ${index + 1}`,
    phone_number: RandomGenerator.mobile(),
  })) satisfies IShoppingMallCustomerProfile.IUpdate[];
  const updatedProfiles: IShoppingMallCustomerProfile[] = [];
  for (const update of profileUpdates) {
    const updatedProfile =
      await api.functional.shoppingMall.customer.profile.update(
        customerConnection,
        {
          body: update,
        },
      );
    typia.assert(updatedProfile);
    updatedProfiles.push(updatedProfile);
  }
  // 4. Administrator retrieves customer profile snapshot history
  const snapshotResponse =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.equals("limit", snapshotResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    snapshotResponse.pagination.records,
    profileUpdates.length,
  );
  TestValidator.equals("total pages", snapshotResponse.pagination.pages, 1);
  // 6. Validate snapshot data
  TestValidator.predicate(
    "snapshots returned",
    snapshotResponse.data.length === profileUpdates.length,
  );
  // 7. Validate snapshots are in descending order by created_at
  for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
    const current = snapshotResponse.data[i];
    const next = snapshotResponse.data[i + 1];
    TestValidator.predicate(
      `snapshot ${i} is newer than ${i + 1}`,
      new Date(current.createdAt).getTime() >=
        new Date(next.createdAt).getTime(),
    );
  }
  // 8. Validate each snapshot contains required fields and matches update values
  for (let i = 0; i < snapshotResponse.data.length; i++) {
    const snapshot = snapshotResponse.data[i];
    // Validate snapshot structure
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has displayName",
      snapshot.displayName !== undefined,
    );
    TestValidator.predicate(
      "snapshot has phoneNumber",
      snapshot.phoneNumber !== undefined && snapshot.phoneNumber !== null,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt !== undefined,
    );
    TestValidator.predicate(
      "snapshot has customer",
      snapshot.customer !== null,
    );
    // Validate customer reference
    TestValidator.equals(
      "customer id matches",
      snapshot.customer.id,
      customerId,
    );
    TestValidator.equals(
      "customer email matches",
      snapshot.customer.email,
      customerEmail,
    );
    // Validate snapshot data matches the profile update values
    // Snapshots are in descending order, so index 0 is the most recent update
    const updateIndex = snapshotResponse.data.length - 1 - i;
    const expectedUpdate = profileUpdates[updateIndex];
    TestValidator.equals(
      `snapshot ${i} display name matches update`,
      snapshot.displayName,
      expectedUpdate.display_name ?? "",
    );
    TestValidator.equals(
      `snapshot ${i} phone number matches update`,
      snapshot.phoneNumber,
      expectedUpdate.phone_number ?? null,
    );
  }
}
