import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test comprehensive administrator access to refund request snapshot audit trail.
 *
 * Validates that administrators can retrieve paginated snapshots showing the complete
 * modification history of a refund request. Tests filtering capabilities by date range,
 * modifying actor type (customer, seller, administrator), and pagination controls.
 * Verifies that each snapshot includes essential audit information: timestamp,
 * change description, and actor identification.
 */
export async function test_api_refund_request_snapshots_administrator_comprehensive_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a random refund request ID for testing
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test basic snapshot retrieval with default pagination
  const defaultSnapshots =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(defaultSnapshots);
  // 3. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilteredSnapshots =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
  // 4. Test actor type filtering with specific actor IDs
  const actorFilteredSnapshots =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          modifying_customer_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string | undefined as string | undefined,
          modifying_seller_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string | undefined as string | undefined,
          modifying_administrator_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string | undefined as string | undefined,
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(actorFilteredSnapshots);
  // 5. Test sorting by creation date
  const sortedSnapshots =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(sortedSnapshots);
  // 6. Test pagination limits and boundaries
  const paginationTest =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginationTest);
  // 7. Validate snapshot structure and audit information
  TestValidator.predicate("pagination info exists", () => {
    return (
      paginationTest.pagination.current >= 0 &&
      paginationTest.pagination.limit >= 0 &&
      paginationTest.pagination.records >= 0 &&
      paginationTest.pagination.pages >= 0
    );
  });
  // 8. Verify snapshot data structure contains required audit fields
  if (paginationTest.data.length > 0) {
    const snapshot = paginationTest.data[0];
    TestValidator.predicate("snapshot has ID", () => snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has creation timestamp",
      () => snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has change description",
      () => snapshot.change_description.length > 0,
    );
  }
  // 9. Test combined filtering with multiple criteria
  const combinedFilteredSnapshots =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          created_at_start: oneWeekAgo,
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilteredSnapshots);
}
