import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatusStatistics";

/**
 * Validate access control for legal hold status statistics endpoint.
 *
 * Business intent:
 *
 * - Ensure that highly sensitive legal hold statistics are exposed only to
 *   authenticated admin actors.
 * - Confirm that unauthenticated calls are rejected, while a properly joined
 *   admin can successfully retrieve statistics.
 *
 * Scenario steps:
 *
 * 1. Derive an unauthenticated connection from the given `connection` without
 *    mutating the original; call the statistics endpoint and assert that it
 *    fails.
 * 2. Register a new admin using POST /auth/admin/join with a valid
 *    IShoppingMallAdminJoin.ICreate payload; typia will ensure DTO correctness.
 *    The join call will also attach the access token onto `connection` via the
 *    SDK.
 * 3. Using the now-authenticated `connection`, call the statistics endpoint again
 *    and assert success with a properly structured
 *    IShoppingMallLegalHoldStatusStatistics response.
 * 4. Perform light but meaningful business validations on the stats payload
 *    (non-negative counts and valid optional ratios).
 */
export async function test_api_admin_legal_hold_status_statistics_sensitive_access_control(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access must be rejected.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to legal hold statistics must fail",
    async () => {
      await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
        unauthenticated,
      );
    },
  );

  // 2. Join a new admin to obtain proper authentication.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 3. Authenticated admin can access the legal hold status statistics.
  const stats =
    await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldStatusStatistics>(stats);

  // Basic business-level validation: totalCount must be non-negative.
  TestValidator.predicate(
    "totalCount in legal hold status statistics must be non-negative",
    stats.totalCount >= 0,
  );

  // Each row must have non-negative count, and ratio if present must be [0, 1].
  for (const row of stats.items) {
    TestValidator.predicate(
      `row count must be non-negative for status ${row.status}`,
      row.count >= 0,
    );

    if (row.ratio !== undefined) {
      TestValidator.predicate(
        `row ratio must be between 0 and 1 for status ${row.status}`,
        row.ratio >= 0 && row.ratio <= 1,
      );
    }
  }

  // If totalCount is 0, all row counts must be 0 as well.
  if (stats.totalCount === 0) {
    for (const row of stats.items) {
      TestValidator.predicate(
        `when totalCount is 0, row count must also be 0 for status ${row.status}`,
        row.count === 0,
      );
    }
  }
}
