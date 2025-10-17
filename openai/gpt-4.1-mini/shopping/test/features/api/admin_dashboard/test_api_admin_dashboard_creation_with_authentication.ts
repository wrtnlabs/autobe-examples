import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";

export async function test_api_admin_dashboard_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Admin signs up
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        status: "active",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create admin dashboard
  const dashboardName: string = RandomGenerator.alphaNumeric(10);
  const description: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const dashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.adminDashboard.create(connection, {
      body: {
        dashboard_name: dashboardName,
        description: description,
      } satisfies IShoppingMallAdminDashboard.ICreate,
    });
  typia.assert(dashboard);

  // 3. Validate response fields
  TestValidator.equals(
    "dashboard_name matches",
    dashboard.dashboard_name,
    dashboardName,
  );
  TestValidator.equals(
    "description matches",
    dashboard.description ?? null,
    description,
  );

  TestValidator.predicate(
    "created_at is ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(
      dashboard.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d+)?Z$/.test(
      dashboard.updated_at,
    ),
  );

  // 4. Unauthorized access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized dashboard creation fails",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.create(
        unauthConn,
        {
          body: {
            dashboard_name: RandomGenerator.alphaNumeric(10),
            description: null,
          } satisfies IShoppingMallAdminDashboard.ICreate,
        },
      );
    },
  );
}
