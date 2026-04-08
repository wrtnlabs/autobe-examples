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
 * Test admin pagination for cancellation request snapshots endpoint.
 *
 * Validates that administrators can retrieve cancellation request snapshots with proper pagination parameters. This test verifies the PATCH endpoint at /ecommerceMall/admin/cancellation-requests/{requestId}/snapshots returns paginated results with correct metadata structure.
 *
 * The test creates an administrator account and calls the snapshots endpoint with various pagination configurations (different page numbers, limits, and sort parameters). It validates that:
 * - The response conforms to IPageIEcommerceMallCancellationRequestSnapshot.ISummary type
 * - Pagination metadata (current, limit, records, pages) is properly computed
 * - Data array contains snapshot summaries with proper structure
 * - Different pagination parameters produce appropriately structured responses
 *
 * 1. Create admin account and authenticate via POST /ecommerceMall/auth/admin/join
 * 2. Call PATCH endpoint with page: 1, limit: 10
 * 3. Validate response structure and pagination metadata
 * 4. Call with page: 2, limit: 5 to verify pagination parameter handling
 * 5. Test explicit sort parameter "-created_at" for descending order
 */
export async function test_api_cancellation_request_snapshots_admin_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Generate a random requestId for the test
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Call PATCH /ecommerceMall/admin/cancellation-requests/{requestId}/snapshots with page: 1, limit: 10
  const page1 =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination has current page",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", page1.pagination.pages >= 0);
  TestValidator.predicate("data is array", Array.isArray(page1.data));
  // 4. Call with different pagination: page: 2, limit: 5
  const page2 =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page2);
  // Validate second page response
  TestValidator.equals("second page current", page2.pagination.current, 2);
  TestValidator.equals("second page limit", page2.pagination.limit, 5);
  // 5. Test explicit sort parameter
  const page3 =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "-created_at",
        },
      },
    );
  typia.assert(page3);
  // Validate sorted response
  TestValidator.equals(
    "sorted response has pagination",
    page3.pagination.current,
    1,
  );
  TestValidator.predicate("sorted data is array", Array.isArray(page3.data));
}
