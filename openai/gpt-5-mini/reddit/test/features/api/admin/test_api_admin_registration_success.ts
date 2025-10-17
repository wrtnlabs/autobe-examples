import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique admin creation data
  const username = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  // Build request body. Use 'satisfies' with the exact DTO type (no type annotation).
  const requestBody = {
    username,
    email,
    password,
    displayName,
    adminLevel: "super",
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  // 2) Call the API to create admin
  const created: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: requestBody,
    });

  // 3) Validate response shape and key business signals
  typia.assert(created); // Full runtime type validation

  // Token issuance: access and refresh must be present
  TestValidator.predicate(
    "access token is present",
    typeof created.token.access === "string" && created.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof created.token.refresh === "string" &&
      created.token.refresh.length > 0,
  );

  // User summary coherence
  TestValidator.equals(
    "returned user username matches request",
    created.user.username,
    username,
  );
  TestValidator.predicate(
    "user.created_at is present",
    created.user.created_at !== null &&
      created.user.created_at !== undefined &&
      created.user.created_at.length > 0,
  );

  // 4) Attempt duplicate creation to ensure uniqueness enforcement (business rule).
  // Expect an error to be thrown by the server for duplicate username/email.
  await TestValidator.error(
    "duplicate admin creation should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: requestBody,
      });
    },
  );
}
