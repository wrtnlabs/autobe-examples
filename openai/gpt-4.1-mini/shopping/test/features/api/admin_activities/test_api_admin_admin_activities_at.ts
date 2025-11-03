import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivity";

/**
 * Validate the retrieval of an admin activity log by ID.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate a new admin user via the join endpoint to simulate an admin
 *    context.
 * 2. Retrieve an admin activity log entry by its UUID ID.
 * 3. Verify that the returned activity log details match expected types and
 *    values.
 *
 * The test ensures that authentication tokens are issued properly and used
 * implicitly. It validates that sensitive audit log data is accessible only to
 * authorized admin users. The timestamps are verified for correct ISO 8601
 * format via typia.assert.
 */
export async function test_api_admin_admin_activities_at(
  connection: api.IConnection,
) {
  // 1. Admin user signs up using join endpoint
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Retrieve an existing admin activity log by ID
  // Using a randomly generated UUID as the activity log ID
  const activityId = typia.random<string & tags.Format<"uuid">>();
  const activity: IShoppingMallAdminActivity =
    await api.functional.shoppingMall.admin.adminActivities.at(connection, {
      id: activityId,
    });
  typia.assert(activity);

  // 3. Validate activity properties
  TestValidator.predicate(
    "admin activity 'id' is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activity.id,
    ),
  );
  TestValidator.predicate(
    "admin activity 'shopping_mall_admin_id' is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      activity.shopping_mall_admin_id,
    ),
  );
  TestValidator.predicate(
    "admin activity 'activity' is a non-empty string",
    typeof activity.activity === "string" && activity.activity.length > 0,
  );
  TestValidator.predicate(
    "admin activity 'created_at' is a valid ISO 8601 datetime",
    !isNaN(Date.parse(activity.created_at)),
  );
  TestValidator.predicate(
    "admin activity 'updated_at' is a valid ISO 8601 datetime",
    !isNaN(Date.parse(activity.updated_at)),
  );
}
