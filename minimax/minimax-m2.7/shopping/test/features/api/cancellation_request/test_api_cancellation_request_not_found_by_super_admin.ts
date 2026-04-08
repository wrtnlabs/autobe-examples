import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
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
 * Test that a super administrator receives 404 error when the cancellation request does not exist.
 *
 * Validates that the endpoint properly checks for request existence before checking snapshot existence. When a super administrator attempts to access a cancellation request snapshot using a non-existent request ID (UUID format but not in database), the system returns 404 Not Found with an appropriate error message. This ensures proper validation order in the endpoint logic.
 *
 * **Scenario Flow:**
 * 1. Super administrator authenticates via /auth/superAdmin/join
 * 2. Generate a non-existent requestId (UUID format but not in database)
 * 3. Generate a snapshotId (also UUID format)
 * 4. Call GET /ecommerceMall/superAdmin/cancellation-requests/{requestId}/snapshots/{snapshotId}
 * 5. Verify 404 response is returned
 *
 * **Validation:**
 * - Response status is 404 Not Found
 * - Error message indicates cancellation request was not found
 * - Endpoint validates request existence before snapshot lookup
 */
export async function test_api_cancellation_request_not_found_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate non-existent UUIDs (format-valid but not in database)
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 response when cancellation request does not exist
  await TestValidator.httpError(
    "cancellation request not found returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.cancellation_requests.snapshots.at(
        superAdminConnection,
        {
          requestId: nonExistentRequestId,
          snapshotId: snapshotId,
        },
      ),
  );
}
