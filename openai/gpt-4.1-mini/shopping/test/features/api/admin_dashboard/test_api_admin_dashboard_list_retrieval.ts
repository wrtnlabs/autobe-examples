import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminDashboard";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";

export async function test_api_admin_dashboard_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin user joins the platform and gets authorized
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = ArrayUtil.repeat(32, () =>
    RandomGenerator.pick(["abcdef0123456789"] as const),
  ).join("");
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password_hash,
        status: "active",
        full_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare realistic filter parameters for the admin dashboard list query
  // Using partial or full filters with valid formats
  const filterName = RandomGenerator.name(1);
  const filterDesc = RandomGenerator.paragraph({ sentences: 3 });
  const nowIso = new Date().toISOString();
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
  const requestBody: IShoppingMallAdminDashboard.IRequest = {
    dashboard_name: filterName,
    description: filterDesc,
    created_at_min: yesterdayIso,
    created_at_max: nowIso,
    updated_at_min: yesterdayIso,
    updated_at_max: nowIso,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdminDashboard.IRequest;

  // 3. Query the admin dashboard list
  const response: IPageIShoppingMallAdminDashboard.ISummary =
    await api.functional.shoppingMall.admin.adminDashboard.index(connection, {
      body: requestBody,
    });
  typia.assert(response);

  // 4. Validate pagination information
  TestValidator.predicate(
    "has pagination info",
    response.hasOwnProperty("pagination"),
  );
  TestValidator.predicate("has data list", response.hasOwnProperty("data"));
  TestValidator.predicate(
    "pagination.current is positive integer",
    response.pagination.current >= 1 &&
      Number.isInteger(response.pagination.current),
  );
  TestValidator.predicate(
    "pagination.limit is positive integer",
    response.pagination.limit >= 1 &&
      Number.isInteger(response.pagination.limit),
  );
  TestValidator.predicate(
    "pagination.pages is non-negative integer",
    response.pagination.pages >= 0 &&
      Number.isInteger(response.pagination.pages),
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    response.pagination.records >= 0 &&
      Number.isInteger(response.pagination.records),
  );

  // 5. Validate each dashboard summary
  for (const summary of response.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "dashboard id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        summary.id,
      ),
    );
    TestValidator.predicate(
      "dashboard name is non-empty string",
      typeof summary.dashboard_name === "string" &&
        summary.dashboard_name.length > 0,
    );
    if (summary.description !== null && summary.description !== undefined) {
      TestValidator.predicate(
        "dashboard description is string or null",
        typeof summary.description === "string",
      );
    }
    // Validate created_at and updated_at are ISO date strings
    TestValidator.predicate(
      "created_at is ISO8601 string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
        summary.created_at,
      ),
    );
    TestValidator.predicate(
      "updated_at is ISO8601 string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
        summary.updated_at,
      ),
    );
  }
}
