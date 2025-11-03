import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration(connection: api.IConnection) {
  // Generate valid admin join data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = "StrongPassword123!";

  // Call api.functional.auth.admin.join with valid data
  const authorizedResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });

  // Assert response type
  typia.assert(authorizedResponse);

  // Validate response properties
  TestValidator.predicate(
    "response contains a valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedResponse.id,
    ),
  );
  TestValidator.equals(
    "response email exactly matches request",
    authorizedResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "response full_name exactly matches request",
    authorizedResponse.full_name,
    adminFullName,
  );
  TestValidator.predicate(
    "response created_at is ISO8601 date-time string",
    typeof authorizedResponse.created_at === "string" &&
      !Number.isNaN(Date.parse(authorizedResponse.created_at)),
  );
  TestValidator.predicate(
    "response updated_at is ISO8601 date-time string",
    typeof authorizedResponse.updated_at === "string" &&
      !Number.isNaN(Date.parse(authorizedResponse.updated_at)),
  );

  // deleted_at can be null or undefined explicitly null for fresh account
  TestValidator.predicate(
    "response deleted_at must be null or undefined",
    authorizedResponse.deleted_at === null ||
      authorizedResponse.deleted_at === undefined,
  );

  // Validate token properties
  const token: IAuthorizationToken = authorizedResponse.token;
  typia.assert(token);
  TestValidator.predicate(
    "token.access is string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO8601 date-time string",
    typeof token.expired_at === "string" &&
      !Number.isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO8601 date-time string",
    typeof token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(token.refreshable_until)),
  );
}
