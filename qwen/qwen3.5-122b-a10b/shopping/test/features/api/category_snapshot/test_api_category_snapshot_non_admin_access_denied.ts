import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that non-administrator users (customers) are denied access to category snapshots.
 * This validates the authorization requirement that only administrators can view category audit trails.
 *
 * Test Steps:
 * 1. Register admin account via authorize_admin_join
 * 2. Register customer account via authorize_customer_join
 * 3. Generate a random snapshot UUID (testing authorization logic, not snapshot existence)
 * 4. Attempt to retrieve the snapshot as customer via api.functional.ecommerceMall.admin.category_snapshots.at
 * 5. Validate that request returns 403 Forbidden status
 *
 * Validation Points:
 * - Request returns 403 Forbidden status
 * - Error indicates insufficient permissions
 * - Snapshot data is not exposed to non-admin users
 * - Customer cannot bypass authorization by guessing snapshot IDs
 *
 * Business Logic Validated:
 * - Category snapshots are restricted to administrators only
 * - Authorization check occurs before snapshot retrieval
 * - No information leakage about category modifications to regular users
 * - Security boundary maintained between admin and member roles
 */
export async function test_api_category_snapshot_non_admin_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Customer setup - register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Generate a random snapshot UUID for testing authorization
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to access category snapshot as customer (should fail with 403)
  await TestValidator.httpError(
    "customer cannot access category snapshot",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.category_snapshots.at(
        customerConnection,
        {
          snapshotId,
        },
      );
    },
  );
}