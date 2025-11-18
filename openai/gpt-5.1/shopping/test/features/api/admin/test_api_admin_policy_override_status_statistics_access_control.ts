import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPolicyOverrideStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverrideStatusStatistics";

export async function test_api_admin_policy_override_status_statistics_access_control(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection clone
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 2. Unauthenticated access must fail with an authorization error (401 or 403)
  await TestValidator.httpError(
    "unauthenticated access to policy override statistics should be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
        unauthenticated,
      );
    },
  );

  // 3. Register an admin via /auth/admin/join using a valid IShoppingMallAdminJoin.ICreate payload
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Authenticated access must succeed and return statistics payload
  const stats: IShoppingMallPolicyOverrideStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
      connection,
    );
  typia.assert(stats);

  // 5. Business validations on statistics payload
  // Sum counts and validate each row's ratio boundaries when present
  let totalCount = 0;
  for (const row of stats.items) {
    totalCount += row.count;

    if (row.ratio !== undefined) {
      TestValidator.predicate(
        "row.ratio, when present, should be between 0 and 1",
        () => row.ratio! >= 0 && row.ratio! <= 1,
      );
    }
  }

  // totalCount must equal the sum of row counts
  TestValidator.equals(
    "totalCount should equal the sum of row counts",
    totalCount,
    stats.totalCount,
  );
}
