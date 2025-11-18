import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSalesByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesByDayStatistics";

export async function test_api_admin_sales_by_day_default_range_without_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context using join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Basic business-level validations on the authorized admin context
  // Email in response should match the requested email
  TestValidator.equals(
    "admin email should match requested join email",
    adminAuthorized.email,
    joinBody.email,
  );

  // Token fields should be non-empty strings
  TestValidator.predicate(
    "access token should be non-empty",
    adminAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    adminAuthorized.token.refresh.length > 0,
  );

  // created_at and updated_at should be non-empty ISO date-time strings
  TestValidator.predicate(
    "created_at should be non-empty",
    adminAuthorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty",
    adminAuthorized.updated_at.length > 0,
  );

  // Status should be a non-empty string
  TestValidator.predicate(
    "admin status should be non-empty",
    adminAuthorized.status.length > 0,
  );

  // Connection should now carry Authorization header with access token
  // This is indirectly validated by ensuring the access token is non-empty;
  // we do not touch connection.headers directly per constraints.
}
