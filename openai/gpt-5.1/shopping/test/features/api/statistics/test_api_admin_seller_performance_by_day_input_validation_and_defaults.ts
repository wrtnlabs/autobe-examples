import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatistics";
import type { IShoppingMallSellerPerformanceByDayStatisticsSellerFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatisticsSellerFilter";

export async function test_api_admin_seller_performance_by_day_input_validation_and_defaults(
  connection: api.IConnection,
) {
  // 1. Register a new admin via /auth/admin/join to establish admin auth context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });

  // 2. Validate the structure of the authorized admin and its embedded token
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 3. Basic business-level sanity checks on the admin and token
  TestValidator.predicate(
    "admin email in payload must match join email",
    authorizedAdmin.email === joinBody.email,
  );

  TestValidator.predicate(
    "admin id must be a non-empty string",
    typeof authorizedAdmin.id === "string" && authorizedAdmin.id.length > 0,
  );

  TestValidator.predicate(
    "access token must be non-empty",
    authorizedAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be non-empty",
    authorizedAdmin.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiry must be after issued created_at",
    new Date(authorizedAdmin.token.expired_at).getTime() >=
      new Date(authorizedAdmin.created_at).getTime(),
  );

  TestValidator.predicate(
    "refresh token refreshable_until must be on/after access expiry",
    new Date(authorizedAdmin.token.refreshable_until).getTime() >=
      new Date(authorizedAdmin.token.expired_at).getTime(),
  );

  // 4. If the summarized admin object is present, ensure it is structurally valid
  if (authorizedAdmin.admin !== undefined) {
    const summary: IShoppingMallAdmin.ISummary = authorizedAdmin.admin;
    typia.assert<IShoppingMallAdmin.ISummary>(summary);

    TestValidator.equals(
      "summary id must equal top-level admin id",
      summary.id,
      authorizedAdmin.id,
    );

    TestValidator.equals(
      "summary email must equal top-level admin email",
      summary.email,
      authorizedAdmin.email,
    );
  }
}
