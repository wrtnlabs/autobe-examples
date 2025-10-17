import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";

export async function test_api_admin_dashboard_update_by_authenticated_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate admin user via join operation to get authenticated token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(16);
  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        status: "active",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Create admin dashboard instance to have an ID to update
  const dashboardNameOriginal = RandomGenerator.name(3);
  const dashboardDescriptionOriginal = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 10,
  });
  const createdDashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.adminDashboard.create(connection, {
      body: {
        dashboard_name: dashboardNameOriginal,
        description: dashboardDescriptionOriginal,
      } satisfies IShoppingMallAdminDashboard.ICreate,
    });
  typia.assert(createdDashboard);

  // 3. Update the admin dashboard details with new values
  const dashboardNameUpdated = RandomGenerator.name(4);
  const dashboardDescriptionUpdated = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 7,
    wordMin: 5,
    wordMax: 9,
  });
  const updatedDashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.adminDashboard.update(connection, {
      id: createdDashboard.id,
      body: {
        dashboard_name: dashboardNameUpdated,
        description: dashboardDescriptionUpdated,
      } satisfies IShoppingMallAdminDashboard.IUpdate,
    });
  typia.assert(updatedDashboard);

  TestValidator.equals(
    "dashboard ID remains the same after update",
    updatedDashboard.id,
    createdDashboard.id,
  );
  TestValidator.equals(
    "dashboard name updated correctly",
    updatedDashboard.dashboard_name,
    dashboardNameUpdated,
  );
  TestValidator.equals(
    "dashboard description updated correctly",
    updatedDashboard.description,
    dashboardDescriptionUpdated,
  );

  // 4. Unauthorized update attempt with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.shoppingMall.admin.adminDashboard.update(
      unauthenticatedConnection,
      {
        id: createdDashboard.id,
        body: {
          dashboard_name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAdminDashboard.IUpdate,
      },
    );
  });
}
