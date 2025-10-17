import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Happy-path E2E test for admin password reset request.
 *
 * Business context:
 *
 * - Admin accounts are created via POST /auth/admin/join and identified by email.
 * - The password reset request endpoint POST /auth/admin/password/reset accepts
 *   an email and must return a privacy-preserving acknowledgement regardless of
 *   whether the email is associated with an account. This test creates a new
 *   admin account and invokes the reset endpoint to validate the happy-path
 *   behaviour.
 *
 * Steps:
 *
 * 1. Create a new admin account using api.functional.auth.admin.join.
 * 2. Trigger password reset for the admin's email using
 *    api.functional.auth.admin.password.reset.requestPasswordReset.
 * 3. Assert the response matches ICommunityPortalAdmin.IResetRequestResponse via
 *    typia.assert and that the acknowledgement message is non-empty and does
 *    not leak the target email.
 * 4. Re-call the endpoint once to observe idempotent/consistent behaviour.
 */
export async function test_api_admin_password_reset_request_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique admin identity
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminPassword = "P@ssw0rd-Testing-123";

  // 2) Create admin account (required fields: username, email, password)
  const createBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  const joined: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  // Runtime type validation
  typia.assert(joined);

  // Basic business assertions about join result using TestValidator
  TestValidator.predicate(
    "created admin has id and token",
    () =>
      typeof joined.id === "string" && typeof joined.token?.access === "string",
  );

  // 3) Request password reset for the created admin
  const resetRequest = {
    email: adminEmail,
  } satisfies ICommunityPortalAdmin.IResetRequest;

  const resetResponse: ICommunityPortalAdmin.IResetRequestResponse =
    await api.functional.auth.admin.password.reset.requestPasswordReset(
      connection,
      { body: resetRequest },
    );
  typia.assert(resetResponse);

  // Validate that the message is a non-empty string and does not leak the email
  TestValidator.predicate(
    "reset message is non-empty string",
    () =>
      typeof resetResponse.message === "string" &&
      resetResponse.message.trim().length > 0,
  );

  TestValidator.predicate(
    "reset response does not leak target email",
    () => !resetResponse.message.includes(adminEmail),
  );

  // 4) Re-call the endpoint quickly to observe consistent acknowledgement
  const resetResponse2: ICommunityPortalAdmin.IResetRequestResponse =
    await api.functional.auth.admin.password.reset.requestPasswordReset(
      connection,
      { body: resetRequest },
    );
  typia.assert(resetResponse2);

  // The API may return the same generic message; ensure both are non-empty and type-valid
  TestValidator.equals(
    "reset acknowledgement message stable type",
    typeof resetResponse.message,
    typeof resetResponse2.message,
  );
}
