import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * End-to-end test for admin order cancellation listing.
 *
 * Validates:
 *
 * - Admin registration and authentication
 * - Assigning the required admin user roles
 * - Retrieving order cancellation requests with pagination and filtering
 * - Correct structure and contents of the paginated response
 * - Includes detailed cancellation reason, status, and linked order/customer info
 *
 * Implements a realistic admin lifecycle and listing usage scenario, verifying
 * business rules and API contract compliance.
 */
export async function test_api_order_cancellation_index_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registers to authenticate with join endpoint
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    full_name: typia.random<string>(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Step 2: Assign admin user role for permission
  const roleAssignBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const assignedRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: roleAssignBody,
    });
  typia.assert(assignedRole);

  // Step 3: Query order cancellations with default pagination
  const orderCancelRequest1: IShoppingMallOrderCancellation.IRequest = {
    page: 1,
    limit: 10,
    search: undefined,
    filterStatus: undefined,
    sortBy: "created_at",
    sortOrder: "desc",
  };

  const page1: IPageIShoppingMallOrderCancellation.ISummary =
    await api.functional.shoppingMall.admin.orderCancellations.index(
      connection,
      {
        body: orderCancelRequest1,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "pagination page and limit within valid range",
    page1.pagination.current === 1 &&
      page1.pagination.limit === 10 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );

  if (page1.data.length > 0) {
    TestValidator.predicate(
      "data length less or equal to page limit",
      page1.data.length <= page1.pagination.limit,
    );

    // Validate each cancellation summary data integrity
    for (const cancelSummary of page1.data) {
      typia.assert(cancelSummary);

      TestValidator.predicate(
        "valid UUIDs for id, order id and customer id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          cancelSummary.id,
        ) &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            cancelSummary.shopping_mall_order_id,
          ) &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            cancelSummary.shopping_mall_customer_id,
          ),
      );

      TestValidator.predicate(
        "cancellation reason may be null or string",
        cancelSummary.cancellation_reason === null ||
          typeof cancelSummary.cancellation_reason === "string",
      );

      TestValidator.predicate(
        "cancellation status is a non-empty string",
        typeof cancelSummary.cancellation_status === "string" &&
          cancelSummary.cancellation_status.length > 0,
      );

      TestValidator.predicate(
        "timestamps are ISO date-time strings",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,}Z$/.test(
          cancelSummary.created_at,
        ) &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]{8,}Z$/.test(
            cancelSummary.updated_at,
          ),
      );
    }
  }

  // Step 4: Query order cancellations filtered by status
  const filterStatus = "pending";
  const orderCancelRequest2: IShoppingMallOrderCancellation.IRequest = {
    page: 1,
    limit: 5,
    search: "invalid",
    filterStatus,
    sortBy: "created_at",
    sortOrder: "asc",
  };

  const page2: IPageIShoppingMallOrderCancellation.ISummary =
    await api.functional.shoppingMall.admin.orderCancellations.index(
      connection,
      {
        body: orderCancelRequest2,
      },
    );
  typia.assert(page2);

  TestValidator.predicate(
    "filterStatus reflected in each result",
    page2.data.every((item) => item.cancellation_status === filterStatus),
  );

  TestValidator.notEquals(
    "filtered data should differ from first query",
    page1.data,
    page2.data,
  );
}
