import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator receives a 404 error when attempting to retrieve
 * snapshots for a non-existent cancellation request.
 *
 * Validates the system's validation logic that checks for cancellation request
 * existence before retrieving snapshots. When an administrator attempts to access
 * snapshots for a non-existent request ID, the system should return HTTP 404
 * with a clear error message indicating the cancellation request was not found.
 *
 * **Business Logic Validation**:
 * - System validates that the cancellation request exists before attempting to retrieve snapshots
 * - Error message clearly indicates the resource was not found
 * - Admin receives proper error response, not a success with empty data
 *
 * 1. Administrator authenticates via POST /ecommerceMall/auth/admin/join.
 * 2. Generate a random UUID that does not correspond to any existing cancellation request.
 * 3. Call PATCH /ecommerceMall/admin/cancellation-requests/{nonExistentRequestId}/snapshots.
 * 4. Verify response returns HTTP 404 with error message indicating cancellation request not found.
 */
export async function test_api_cancellation_request_snapshots_admin_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a random UUID that does not correspond to any existing cancellation request
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call PATCH /ecommerceMall/admin/cancellation-requests/{nonExistentRequestId}/snapshots
  // 4. Verify response returns HTTP 404 with error message indicating cancellation request not found
  await TestValidator.httpError(
    "cancellation request not found returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
        adminConnection,
        {
          requestId: nonExistentRequestId,
          body: {
            page: 1,
            limit: 20,
          },
        },
      ),
  );
}
