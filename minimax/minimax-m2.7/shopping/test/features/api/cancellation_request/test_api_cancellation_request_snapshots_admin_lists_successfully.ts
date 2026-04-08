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
 * Test that an administrator can successfully retrieve a paginated list of snapshots for a cancellation request.
 *
 * Validates that administrators can access cancellation request snapshots with proper pagination metadata. The test verifies the endpoint returns correctly structured responses with all required fields including pagination information and snapshot data arrays.
 *
 * **Test Flow:**
 * 1. Administrator registers and authenticates via admin join endpoint
 * 2. Creates actor-specific connection with admin authorization
 * 3. Calls the cancellation request snapshots listing endpoint with valid request parameters
 * 4. Validates response structure includes pagination metadata (current, limit, records, pages)
 * 5. Validates response data array contains snapshot objects with required properties
 *
 * **Business Logic Validation:**
 * - Admin can access any cancellation request snapshot regardless of ownership
 * - Response includes complete pagination metadata for UI rendering
 * - Snapshot data structure contains all required fields (id, reason, status, createdAt, cancellationRequest)
 */
export async function test_api_cancellation_request_snapshots_admin_lists_successfully(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a valid cancellation request ID for testing
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the admin snapshots listing endpoint with pagination parameters
  const response =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: cancellationRequestId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  // 4. Validate complete response structure using typia.assert()
  typia.assert(response);
  // 5. Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination current page is valid integer",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid integer",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid integer",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid integer",
    response.pagination.pages >= 0,
  );
  // 6. Validate data array exists and is properly typed
  TestValidator.equals(
    "data array is present",
    Array.isArray(response.data),
    true,
  );
  // 7. If snapshots exist, validate their structure
  if (response.data.length > 0) {
    const firstSnapshot = response.data[0];
    TestValidator.equals(
      "snapshot has id",
      firstSnapshot.id !== null && firstSnapshot.id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has reason",
      firstSnapshot.reason !== null && firstSnapshot.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has status",
      firstSnapshot.status !== null && firstSnapshot.status !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has createdAt timestamp",
      firstSnapshot.createdAt !== null && firstSnapshot.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has cancellationRequest reference",
      firstSnapshot.cancellationRequest !== null &&
        firstSnapshot.cancellationRequest !== undefined,
      true,
    );
    // Validate status is either 'approved' or 'rejected'
    TestValidator.equals(
      "snapshot status is valid",
      ["approved", "rejected"].includes(firstSnapshot.status),
      true,
    );
  }
}