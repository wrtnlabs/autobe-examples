import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";

/**
 * Test retrieval of detailed admin dashboard information by ID.
 *
 * This test covers the complete workflow for an admin user joining the system,
 * creating an admin dashboard entry, then retrieving its details by UUID. It
 * ensures the returned data matches expectations and validates authorization is
 * enforced, rejecting unauthenticated access.
 *
 * Steps:
 *
 * 1. Admin user joins the system and obtains authorization
 * 2. Create new admin dashboard entry with unique dashboard name and optional
 *    description
 * 3. Retrieve the admin dashboard entry by its unique ID and validate fields
 * 4. Attempt unauthorized retrieval and verify failure
 *
 * This test ensures proper admin authentication, data creation, data retrieval,
 * and authorization enforcement for sensitive admin dashboard details.
 */
export async function test_api_admin_dashboard_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin joins the system to get authenticated
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create admin dashboard entry
  const dashboardCreateBody = {
    dashboard_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallAdminDashboard.ICreate;

  const createdDashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.adminDashboard.create(connection, {
      body: dashboardCreateBody,
    });
  typia.assert(createdDashboard);

  // 3. Retrieve dashboard detail by id
  const retrievedDashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.adminDashboard.at(connection, {
      id: createdDashboard.id,
    });
  typia.assert(retrievedDashboard);

  // Validate retrieved matches created
  TestValidator.equals(
    "dashboard ID should match",
    retrievedDashboard.id,
    createdDashboard.id,
  );
  TestValidator.equals(
    "dashboard name should match",
    retrievedDashboard.dashboard_name,
    createdDashboard.dashboard_name,
  );
  TestValidator.equals(
    "dashboard description should match",
    retrievedDashboard.description,
    createdDashboard.description,
  );
  TestValidator.equals(
    "dashboard deleted_at should match",
    retrievedDashboard.deleted_at ?? null,
    createdDashboard.deleted_at ?? null,
  );

  // 4. Test unauthorized access failure - create unauth connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to dashboard retrieval",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.at(unauthConn, {
        id: createdDashboard.id,
      });
    },
  );
}
