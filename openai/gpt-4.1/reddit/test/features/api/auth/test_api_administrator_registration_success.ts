import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

export async function test_api_administrator_registration_success(
  connection: api.IConnection,
) {
  // Generate unique, valid credentials for registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  // Optionally, randomly assign business_status (very sparse: often null, sometimes value)
  const includeBusinessStatus = RandomGenerator.pick([true, false]);
  const businessStatus = includeBusinessStatus
    ? RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })
    : undefined;

  // Compose request with or without business_status
  const requestBody = Object.assign(
    {
      email: adminEmail,
      password: adminPassword,
    },
    includeBusinessStatus ? { business_status: businessStatus } : {},
  ) satisfies ICommunityPlatformAdministrator.ICreate;

  // Register administrator
  const response = await api.functional.auth.administrator.join(connection, {
    body: requestBody,
  });
  typia.assert(response);

  // ID (uuid) and email must be present
  TestValidator.predicate(
    "id is uuid",
    typeof response.id === "string" &&
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
        response.id,
      ),
  );
  TestValidator.equals(
    "email in response equals registered email",
    response.email,
    adminEmail,
  );

  // status is "active" by default
  TestValidator.equals("status is active", response.status, "active");

  // Optional business_status: reflects input or is null/undefined
  if (includeBusinessStatus) {
    TestValidator.equals(
      "business_status matches input",
      response.business_status,
      businessStatus,
    );
  } else {
    TestValidator.predicate(
      "business_status is undefined or null if not set",
      response.business_status === undefined ||
        response.business_status === null,
    );
  }

  // Created and updated timestamps present and ISO 8601
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof response.created_at === "string" &&
      !Number.isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof response.updated_at === "string" &&
      !Number.isNaN(Date.parse(response.updated_at)),
  );

  // deleted_at is null/undefined
  TestValidator.predicate(
    "deleted_at is null/undefined on active account",
    response.deleted_at === null || response.deleted_at === undefined,
  );

  // Token structure and fields
  typia.assert<IAuthorizationToken>(response.token);
  TestValidator.predicate(
    "access token present",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601",
    typeof response.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601",
    typeof response.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(response.token.refreshable_until)),
  );

  // Negative assertions: no password/hash fields present
  TestValidator.predicate(
    "no plain password returned",
    !Object.prototype.hasOwnProperty.call(response, "password"),
  );
  TestValidator.predicate(
    "no password_hash in response",
    !Object.prototype.hasOwnProperty.call(response, "password_hash"),
  );
}
