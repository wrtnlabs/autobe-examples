import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorRiskSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskSummary";
import type { IShoppingMallActorRiskSummaryPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskSummaryPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Ensure admin-only risk summary endpoint enforces authentication.
 *
 * Business purpose:
 *
 * - `/shoppingMall/admin/actors/riskSummary` exposes sensitive, aggregated risk
 *   analytics and must only be accessible to authenticated admin actors.
 * - Unauthenticated callers must not be able to retrieve the summary at all.
 * - Once an administrator successfully joins (and is implicitly logged in), the
 *   same endpoint must work and return a structurally valid
 *   `IShoppingMallActorRiskSummary` payload.
 *
 * Test flow:
 *
 * 1. Create an "unauthenticated" connection object by shallow-cloning the provided
 *    `connection` and overriding `headers` with an empty object. This
 *    guarantees that no Authorization header is present and respects the
 *    prohibition on mutating `connection.headers` directly.
 * 2. Call `api.functional.shoppingMall.admin.actors.riskSummary.at` with the
 *    unauthenticated connection and assert that it fails using `await
 *    TestValidator.error(...)`. Do not check HTTP status codes or error bodies;
 *    only assert that an error occurs.
 * 3. Using the original `connection`, call `api.functional.auth.admin.join` with a
 *    randomly generated `IShoppingMallAdminJoin.ICreate` body to register and
 *    authenticate an admin. The SDK will automatically set the Authorization
 *    header on the original connection. Assert the response type with
 *    `typia.assert`.
 * 4. With this now-authenticated `connection`, call
 *    `api.functional.shoppingMall.admin.actors.riskSummary.at` again and assert
 *    the successful response using `typia.assert` to validate it as
 *    `IShoppingMallActorRiskSummary`.
 *
 * Notes and constraints:
 *
 * - Do not attempt to manually touch or inspect `connection.headers` beyond
 *   providing `{ headers: {} }` in the cloned unauthenticated connection
 *   object; the SDK controls headers internally.
 * - Do not test specific HTTP status codes, nor the detailed error payload shape,
 *   only that an error is thrown for the unauthenticated call.
 * - Use `typia.random<IShoppingMallAdminJoin.ICreate>()` to build join body, and
 *   `typia.assert` for both `IShoppingMallAdmin.IAuthorized` and
 *   `IShoppingMallActorRiskSummary` responses.
 */
export async function test_api_admin_actor_risk_summary_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection clone
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Unauthenticated call must fail
  await TestValidator.error(
    "risk summary requires authentication",
    async () => {
      await api.functional.shoppingMall.admin.actors.riskSummary.at(
        unauthenticated,
      );
    },
  );

  // 3. Join an admin (this will authenticate the original connection)
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 4. Authenticated call must succeed and return valid summary
  const summary: IShoppingMallActorRiskSummary =
    await api.functional.shoppingMall.admin.actors.riskSummary.at(connection);
  typia.assert<IShoppingMallActorRiskSummary>(summary);
}
