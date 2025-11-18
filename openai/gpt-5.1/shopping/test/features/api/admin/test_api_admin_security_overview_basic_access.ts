import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverview";
import type { IShoppingMallActorSecurityOverviewPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverviewPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can retrieve the actors security
 * overview with default parameters and that the response structure contains
 * only aggregated, non-sensitive information.
 *
 * Business workflow:
 *
 * 1. Register a new admin through POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate to bootstrap an administrator account and
 *    obtain JWT tokens via IShoppingMallAdmin.IAuthorized. The SDK will
 *    automatically propagate the access token into the connection headers.
 * 2. Immediately call GET /shoppingMall/admin/actors/securityOverview through
 *    api.functional.shoppingMall.admin.actors.securityOverview.at(connection)
 *    without any additional parameters, relying on the default aggregation
 *    window configured on the backend.
 * 3. Assert that the returned value conforms to IShoppingMallActorSecurityOverview
 *    using typia.assert, thereby fully validating the response typing.
 * 4. Perform business-level validations:
 *
 *    - TotalSecurityEventCount must be a non-negative integer.
 *    - PerActorType must be a defined array (possibly empty).
 * 5. If perActorType is non-empty, inspect the first element and verify:
 *
 *    - ActorType is a non-empty string.
 *    - RecentFailedLoginCount, recentSuccessfulLoginCount, recentPasswordResetCount,
 *         and activeRiskFlagCount are all non-negative integers.
 * 6. Sanity-check that obviously sensitive fields (like raw password hashes) are
 *    not exposed anywhere in the overview payload by confirming that suspicious
 *    property names such as "password_hash" are absent on the root object and
 *    per-actor-type entries. Note that this is a lightweight negative check on
 *    property names rather than deep schema inspection, complementing
 *    typia.assert's structural validation.
 */
export async function test_api_admin_security_overview_basic_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Keep IP optional to demonstrate null-handling: send null explicitly.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // Ensure token is present and structurally correct.
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);
  TestValidator.predicate(
    "admin access token should be a non-empty string",
    authorizedAdmin.token.access.length > 0,
  );

  // 2. Call the security overview endpoint with default parameters.
  const overview: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.admin.actors.securityOverview.at(
      connection,
    );
  typia.assert<IShoppingMallActorSecurityOverview>(overview);

  // 3. Validate top-level metrics.
  TestValidator.predicate(
    "totalSecurityEventCount should be a non-negative integer",
    Number.isInteger(overview.totalSecurityEventCount) &&
      overview.totalSecurityEventCount >= 0,
  );

  TestValidator.predicate(
    "perActorType must be a defined array (possibly empty)",
    Array.isArray(overview.perActorType),
  );

  // 4. If there is at least one actor-type slice, validate its metrics.
  if (overview.perActorType.length > 0) {
    const first: IShoppingMallActorSecurityOverviewPerActorType =
      overview.perActorType[0];
    typia.assert<IShoppingMallActorSecurityOverviewPerActorType>(first);

    TestValidator.predicate(
      "actorType should be a non-empty string",
      typeof first.actorType === "string" && first.actorType.length > 0,
    );

    TestValidator.predicate(
      "recentFailedLoginCount should be a non-negative integer",
      Number.isInteger(first.recentFailedLoginCount) &&
        first.recentFailedLoginCount >= 0,
    );

    TestValidator.predicate(
      "recentSuccessfulLoginCount should be a non-negative integer",
      Number.isInteger(first.recentSuccessfulLoginCount) &&
        first.recentSuccessfulLoginCount >= 0,
    );

    TestValidator.predicate(
      "recentPasswordResetCount should be a non-negative integer",
      Number.isInteger(first.recentPasswordResetCount) &&
        first.recentPasswordResetCount >= 0,
    );

    TestValidator.predicate(
      "activeRiskFlagCount should be a non-negative integer",
      Number.isInteger(first.activeRiskFlagCount) &&
        first.activeRiskFlagCount >= 0,
    );
  }

  // 5. Ensure that sensitive implementation details like password hashes are
  // not exposed by checking for suspicious property names on the root object.
  const rootKeys: string[] = Object.keys(overview);
  TestValidator.predicate(
    "root overview object must not expose password_hash field",
    rootKeys.includes("password_hash") === false,
  );

  // Also check each per-actor-type entry for such fields.
  for (const entry of overview.perActorType) {
    const entryKeys: string[] = Object.keys(entry);
    TestValidator.predicate(
      "perActorType entry must not expose password_hash field",
      entryKeys.includes("password_hash") === false,
    );
  }
}
