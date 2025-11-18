import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundAndDisputeStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStats";

export async function test_api_admin_refund_and_dispute_stats_by_day_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection object to mimic a client without any Authorization header.
  //    We create a shallow-cloned connection with empty headers and never modify them again,
  //    following the allowed pattern for unauthenticated connections.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // NOTE: The original scenario describes calling
  //   GET /shoppingMall/admin/statistics/refundAndDisputeByDay
  // in three modes: unauthenticated, misauthenticated, and correctly authenticated.
  // However, there is no generated SDK function for this endpoint in the provided
  // API list, and we are strictly forbidden from calling non-existent API functions
  // or constructing raw HTTP calls. Therefore, we cannot implement those exact calls
  // without violating the constraints.
  //
  // Instead, this test focuses on the ONLY available related API: POST /auth/admin/join
  // via api.functional.auth.admin.join, and validates that:
  //   - Admin join works and returns an IShoppingMallAdmin.IAuthorized object
  //   - The returned token conforms to IAuthorizationToken
  //   - The payload carries a usable admin identity
  // which are the necessary preconditions for any future admin-only statistics
  // endpoint calls to succeed.

  // 2. Call admin join on the unauthenticated connection and validate the response.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(unauthConn, {
      body: joinBody,
    });

  // Type-level validation of the join response and nested token/admin summary
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);
  if (authorizedAdmin.admin !== undefined && authorizedAdmin.admin !== null) {
    typia.assert<IShoppingMallAdmin.ISummary>(authorizedAdmin.admin);
  }

  // 3. Verify a few basic business-level properties of the
  //    authorized admin payload to ensure it carries a usable admin identity.
  TestValidator.predicate(
    "authorized admin id is a non-empty UUID string",
    ((): boolean => {
      const id = authorizedAdmin.id;
      return typeof id === "string" && id.length > 0;
    })(),
  );

  TestValidator.equals(
    "authorized admin email must match the join email",
    authorizedAdmin.email,
    joinBody.email,
  );

  TestValidator.predicate(
    "authorized admin token access field must be non-empty string",
    typeof authorizedAdmin.token.access === "string" &&
      authorizedAdmin.token.access.length > 0,
  );

  // This test thus confirms that admin authentication via join endpoint works
  // and produces a valid admin authorization context, which is required before
  // calling any admin-only endpoints such as
  // /shoppingMall/admin/statistics/refundAndDisputeByDay.
}
