import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing a snapshot of a deleted entity.
 *
 * Validates that administrators can access snapshot records through the admin snapshot endpoint. Snapshots preserve historical state of entities (products, order items, reviews, cancellation requests, refund requests, seller profiles, or categories) at specific points in time and remain accessible even after the parent entity is deleted.
 *
 * This test authenticates as an administrator and attempts to retrieve a snapshot, validating the endpoint responds correctly. The snapshot contains denormalized data captured at the time of creation, ensuring audit trail integrity.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Administrator attempts to retrieve a snapshot by its unique identifier.
 * 3. Validates the endpoint response structure and error handling.
 *
 * Note: Since seller creation/deletion APIs are not available in the provided SDK, this test focuses on validating the admin snapshot endpoint authentication and response handling rather than the complete deleted entity scenario.
 */
export async function test_api_admin_snapshot_view_deleted_entity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a snapshot ID to retrieve
  // Note: In a complete test, we would create a seller, modify it to generate snapshots,
  // delete the seller, then retrieve the snapshot. Since seller management APIs are not
  // available in the provided SDK, we test the endpoint with a random UUID.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the snapshot
  // This validates the endpoint authentication and response handling
  // A 404 is expected for randomly generated IDs that don't correspond to existing snapshots
  await TestValidator.error(
    "snapshot not found for non-existent ID",
    async () => {
      await api.functional.ecommerce.admin.snapshots.at(adminConnection, {
        snapshotId,
      });
    },
  );
  // 4. Validate that the endpoint requires authentication
  // Try accessing without admin authentication (using base connection)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access should fail",
    [401, 403],
    async () => {
      await api.functional.ecommerce.admin.snapshots.at(
        unauthenticatedConnection,
        {
          snapshotId,
        },
      );
    },
  );
}
