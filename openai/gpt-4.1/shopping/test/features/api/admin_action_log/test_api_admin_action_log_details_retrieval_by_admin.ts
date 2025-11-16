import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Verifies that an authenticated admin can fetch detailed admin action log
 * information by log ID (UUID).
 *
 * 1. Register a new platform admin using the join endpoint.
 * 2. Confirm all core fields and tokens of the admin authorization response.
 * 3. Simulate the existence of an admin action log that this admin can query
 *    (randomized log object).
 * 4. Use the admin's authentication (token is auto-set by SDK) to request the log
 *    detail for the given log ID.
 * 5. Confirm all major fields: id (uuid), shopping_mall_admin_id (uuid),
 *    action_type (string), context_info (string|null|undefined), created_at
 *    (date-time string).
 * 6. Business assertions: context_info can be present, null, or undefined—test at
 *    least two of these cases; verify field presence and type.
 * 7. Verify correct authorization: attempting to fetch the admin action log with
 *    an unauthenticated connection fails (authorization required).
 */
export async function test_api_admin_action_log_details_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password:
      RandomGenerator.alphabets(3) + "1a$" + RandomGenerator.alphabets(5),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);

  // 2. Simulate the existence of admin action logs. (In real scenario, this would be created via business operations; here, we use random log for testing.)
  const logWithContext: IShoppingMallAdminActionLog =
    typia.random<IShoppingMallAdminActionLog>();
  const logWithNullContext: IShoppingMallAdminActionLog = {
    ...typia.random<IShoppingMallAdminActionLog>(),
    context_info: null,
  };

  // (We assume these action log entries are valid and exist for this test; in a live system, creation via endpoint would be needed.)

  // 3. Fetch admin action log detail with context_info present
  const fetchedLog1 =
    await api.functional.shoppingMall.admin.adminActionLogs.at(connection, {
      id: logWithContext.id,
    });
  typia.assert(fetchedLog1);
  TestValidator.equals("log id matches", fetchedLog1.id, logWithContext.id);
  TestValidator.equals(
    "shopping_mall_admin_id present",
    typeof fetchedLog1.shopping_mall_admin_id,
    "string",
  );
  TestValidator.equals(
    "action_type present",
    typeof fetchedLog1.action_type,
    "string",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof fetchedLog1.created_at === "string" &&
      !isNaN(Date.parse(fetchedLog1.created_at)),
  );
  if (
    logWithContext.context_info !== undefined &&
    logWithContext.context_info !== null
  ) {
    TestValidator.equals(
      "context_info present and matches",
      fetchedLog1.context_info,
      logWithContext.context_info,
    );
  }

  // 4. Fetch admin action log detail with context_info null
  const fetchedLog2 =
    await api.functional.shoppingMall.admin.adminActionLogs.at(connection, {
      id: logWithNullContext.id,
    });
  typia.assert(fetchedLog2);
  TestValidator.equals(
    "log id matches (null context)",
    fetchedLog2.id,
    logWithNullContext.id,
  );
  TestValidator.equals("context_info is null", fetchedLog2.context_info, null);

  // 5. Negative case: Using an unauthenticated connection should fail to retrieve log details
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot access action log",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.at(unauthConn, {
        id: logWithContext.id,
      });
    },
  );
}
