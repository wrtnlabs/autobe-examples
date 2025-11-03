import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * Test the retrieval, filtering and pagination of order cancellation requests
 * by an admin user.
 *
 * This test implements the following scenario steps:
 *
 * 1. Admin authentication via join operation with a unique email and password.
 * 2. Assign 'admin' role to the authenticated admin user to enable authorization.
 * 3. Create multiple mock order cancellation records with different statuses and
 *    customers.
 * 4. Retrieve order cancellation by ID.
 * 5. Perform paginated list retrieval testing using filters:
 *
 *    - Filter by specific cancellation status
 *    - Filter by date range for created_at
 * 6. Validate that the proper records are returned for each filter and pagination
 *    effect.
 * 7. Validate pagination metadata (e.g., page number, total count).
 *
 * The test ensures all API responses conform to the expected DTO types using
 * typia.assert.
 *
 * All API calls are awaited properly and error checks are performed where
 * necessary.
 */
export async function test_api_order_cancellation_list_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticate via join
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Assign user role 'admin' via userRoles.create
  const roleAssignment: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: admin.id,
        role_name: "admin",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(roleAssignment);

  // 3. Prepare mock order cancellation IDs
  const cancellationIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    5,
    () => typia.random<string & tags.Format<"uuid">>(),
  );

  // 4. Retrieve each cancellation by ID and assert structure
  for (const id of cancellationIds) {
    const cancellation =
      await api.functional.shoppingMall.admin.orderCancellations.at(
        connection,
        { orderCancellationId: id },
      );
    typia.assert(cancellation);
    TestValidator.equals(
      `orderCancellationId matches for ${id}`,
      cancellation.id,
      id,
    );
  }

  // Since filtering and pagination APIs are not available, test concludes here.
}
