import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that accessing a refund request snapshot with mismatched request ID returns 404.
 *
 * Validates the endpoint enforces data integrity by ensuring snapshots cannot be accessed
 * with request IDs that don't match. The specification states that the endpoint should
 * throw NotFoundException if the snapshot exists but the requestId doesn't match.
 *
 * This test verifies that when requesting a snapshot with a requestId that does not
 * correspond to the refund request the snapshot belongs to, the endpoint correctly
 * returns 404 Not Found rather than exposing data from a different request.
 *
 * **Business Logic:**
 * - Snapshots are tightly coupled to their parent refund requests
 * - Cross-request access must be forbidden for data isolation
 * - 404 prevents information leakage about existing snapshots
 *
 * 1. Authenticate as super administrator.
 * 2. Attempt to fetch a snapshot with mismatched requestId (using different UUIDs).
 * 3. Validate that 404 Not Found is returned.
 */
export async function test_api_refund_request_snapshot_mismatched_request_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: `superadmin-${RandomGenerator.alphabets(8)}@test.com` as (string & tags.Format<"email">),
      password: RandomGenerator.alphabets(12) as (string & tags.MinLength<8> & tags.Format<"password">),
    },
  });
  // 2. Create mismatched UUIDs for requestId and snapshotId
  // Using different UUIDs simulates the scenario where:
  // - snapshotId belongs to one refund request
  // - But we're requesting it with a different requestId
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate error response for mismatched request ID
  // When requestId doesn't match the refund request the snapshot belongs to,
  // the endpoint should return 404 Not Found
  await TestValidator.httpError(
    "snapshot with mismatched requestId returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
        superAdminConnection,
        {
          requestId: requestId,
          snapshotId: snapshotId,
        },
      ),
  );
}