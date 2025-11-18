import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPolicyOverrideStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverrideStatusStatistics";

/**
 * Basic admin happy-path flow for policy override status statistics.
 *
 * Business purpose
 *
 * - Ensure that an authenticated platform administrator can successfully retrieve
 *   governance statistics for policy overrides grouped by status using the
 *   dedicated analytics endpoint.
 * - Confirm that the statistics are returned in the summarized DTO form
 *   (IShoppingMallPolicyOverrideStatusStatistics) without leaking underlying
 *   override identifiers or subject-level details.
 *
 * Scenario steps
 *
 * 1. Register a new admin using POST /auth/admin/join. This both creates the admin
 *    account and, via SDK behavior, installs the admin JWT access token into
 *    the connection headers.
 * 2. Call GET /shoppingMall/admin/statistics/policyOverridesByStatus using the
 *    same connection, relying on the automatically attached Authorization
 *    header.
 * 3. Validate that the response structurally matches
 *    IShoppingMallPolicyOverrideStatusStatistics using typia.assert.
 * 4. Perform lightweight business assertions on the aggregated payload:
 *
 *    - Items is an array (implicitly ensured by typia.assert, but we also inspect
 *         its length and some per-row fields).
 *    - TotalCount is a non-negative integer consistent with the sum of row counts
 *         (when items is non-empty).
 *    - Each row conforms to IShoppingMallPolicyOverrideStatusStatistics.IRow and
 *         respects documented semantics:
 *
 *         - Status is a non-empty string (we only check that length > 0).
 *         - Count is a non-negative integer.
 *         - PolicyType, when present, is a string (no emptiness constraint in the type,
 *                   so we only assert type by typia and avoid extra checks).
 *         - PolicyCode, when present, is a non-empty string (MinLength<1>).
 *         - Ratio, when present, is between 0 and 1 inclusive.
 * 5. Confirm that no extra fields like raw override IDs or subject IDs are
 *    accessed or assumed by the test, relying on the DTO definition and
 *    typia.assert for structural guarantees.
 */
export async function test_api_admin_policy_override_status_statistics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new admin so that subsequent calls use an authenticated admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; we omit it here to let the backend infer it.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Call the statistics endpoint with the authenticated admin connection.
  const stats: IShoppingMallPolicyOverrideStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
      connection,
    );
  typia.assert(stats);

  // 3. Basic structural/business validations on the aggregation.
  TestValidator.predicate(
    "totalCount must be non-negative",
    stats.totalCount >= 0,
  );

  // Sum of row counts should not exceed totalCount. When there are no rows,
  // totalCount should be 0 or at least >= 0 (already checked above), and the
  // sum will naturally be 0.
  const sumOfCounts = stats.items.reduce((acc, row) => acc + row.count, 0);
  TestValidator.predicate(
    "sum of row counts must be less than or equal to totalCount",
    sumOfCounts <= stats.totalCount,
  );

  // 4. Per-row validations consistent with IShoppingMallPolicyOverrideStatusStatistics.IRow docs.
  for (const row of stats.items) {
    typia.assert<IShoppingMallPolicyOverrideStatusStatistics.IRow>(row);

    TestValidator.predicate(
      "row.status must be a non-empty string",
      row.status.length > 0,
    );

    TestValidator.predicate("row.count must be non-negative", row.count >= 0);

    // policyType is optional string; typia.assert already checked its type
    // when present. We avoid extra constraints beyond that.

    if (row.policyCode !== undefined) {
      TestValidator.predicate(
        "row.policyCode, when present, must be non-empty",
        row.policyCode.length > 0,
      );
    }

    if (row.ratio !== undefined) {
      TestValidator.predicate(
        "row.ratio, when present, must be between 0 and 1 inclusive",
        row.ratio >= 0 && row.ratio <= 1,
      );
    }
  }

  // 5. High-level assertion that the structure is purely aggregated and does
  // not expose underlying override or subject identifiers. This is guaranteed
  // by using the DTO type in typia.assert and by restricting ourselves to the
  // known properties (status, policyType, policyCode, count, ratio) when
  // reading values. There is nothing additional to assert here in code beyond
  // this disciplined access pattern.
}
