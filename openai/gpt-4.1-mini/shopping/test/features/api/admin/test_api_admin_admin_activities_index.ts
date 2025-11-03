import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActivity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivity";

export async function test_api_admin_admin_activities_index(
  connection: api.IConnection,
) {
  // 1. Admin user joins to authenticate
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "strongpassword123",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // Validate authorization token exists
  TestValidator.predicate(
    "admin token present",
    typeof adminAuthorized.token.access === "string" &&
      adminAuthorized.token.access.length > 0,
  );

  // 2. Prepare admin activity search request
  const requestBody: IShoppingMallAdminActivity.IRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
    filterAdminId: adminAuthorized.id,
  };

  // 3. Request admin activities index
  const activitiesPage: IPageIShoppingMallAdminActivity.ISummary =
    await api.functional.shoppingMall.admin.adminActivities.index(connection, {
      body: requestBody,
    });
  typia.assert(activitiesPage);

  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    activitiesPage.pagination !== null &&
      typeof activitiesPage.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page is correct",
    activitiesPage.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    activitiesPage.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination pages is a positive number",
    activitiesPage.pagination.pages > 0,
  );

  // 5. Validate each admin activity summary
  for (const activity of activitiesPage.data) {
    typia.assert(activity);
    // UUID and date-time formats already validated by typia.assert
    // Check the admin summary is consistent
    if (activity.admin !== undefined && activity.admin !== null) {
      typia.assert(activity.admin);
      TestValidator.equals(
        "admin summary ID matches filter",
        activity.admin.id,
        requestBody.filterAdminId!,
      );
    }
  }
}
