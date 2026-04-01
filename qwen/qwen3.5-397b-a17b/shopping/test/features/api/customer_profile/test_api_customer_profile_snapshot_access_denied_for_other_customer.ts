import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a customer cannot view another customer's profile snapshot.
 *
 * This test validates the access control business rule that customers can only
 * view snapshots of their own profile. The test:
 * 1. Registers and authenticates as customer A (will attempt unauthorized access)
 * 2. Registers and authenticates as customer B (snapshot owner)
 * 3. As customer B, updates their profile to create a snapshot
 * 4. Retrieves customer B's snapshot ID by listing their profile snapshots
 * 5. Switches back to customer A's authentication context
 * 6. Attempts to retrieve customer B's snapshot using the snapshot ID
 * 7. Verifies the system returns 403 Forbidden error indicating insufficient permissions
 */
export async function test_api_customer_profile_snapshot_access_denied_for_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer A (unauthorized accessor)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Register and authenticate as customer B (snapshot owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. As customer B, update their profile to create a snapshot
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerBConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Retrieve customer B's snapshot ID by listing their profile snapshots
  const snapshotsList =
    await api.functional.shoppingMall.customer.profile.snapshots.index(
      customerBConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsList);
  // Verify at least one snapshot exists
  TestValidator.predicate(
    "customer B has snapshots",
    snapshotsList.data.length > 0,
  );
  // Get the first snapshot ID with proper type
  const snapshotId = snapshotsList.data[0]!.id satisfies string &
    tags.Format<"uuid">;
  // 5-6. As customer A, attempt to retrieve customer B's snapshot
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "customer A cannot access customer B's snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.customer.profile.snapshots.at(
        customerAConnection,
        {
          snapshotId: snapshotId,
        },
      );
    },
  );
}
