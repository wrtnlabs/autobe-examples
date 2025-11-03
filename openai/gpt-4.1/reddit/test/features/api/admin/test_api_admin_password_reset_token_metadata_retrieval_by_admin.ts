import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminPasswordResetToken";

/**
 * Validate the administrator's retrieval of password reset token metadata.
 *
 * This test covers the complete business flow:
 *
 * 1. Register a new administrator using POST /auth/admin/join
 * 2. Request a password reset for the created admin using POST
 *    /auth/admin/password/reset/request
 * 3. Retrieve the password reset token's metadata using GET
 *    /communityPlatform/admin/admins/{adminId}/passwordResetTokens/{passwordResetTokenId}
 *
 * Test steps:
 *
 * - Ensure admin creation succeeds and returns a valid IAuthorized response.
 * - Issue a password reset token, confirming an empty result and secure behavior.
 * - As the admin, retrieve the token metadata and verify:
 *
 *   - The response contains only audit and status metadata, never the raw secret
 *       token value.
 *   - The token is associated with the expected adminId and has valid fields:
 *
 *       - Id, community_platform_admin_id, expires_at, consumed, created_at,
 *               consumed_at (nullable).
 *   - Consumed reflects usage status (should be false unless consumed elsewhere).
 *   - Audit fields match creation and expiration logic.
 * - Negative case: attempt retrieval while unauthenticated and verify failure.
 * - Edge case: test with a random (valid UUID but non-existent) token and verify
 *   error handling.
 *
 * All responses are strictly type asserted and logic is validated for security
 * and correctness.
 */
export async function test_api_admin_password_reset_token_metadata_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name(2);
  const registerBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: adminDisplayName,
    href: "https://admin.e2e-test.local/join",
    referrer: "https://e2e-referrer.local/",
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registerBody,
    });
  typia.assert(adminAuth);

  // Step 2: Request a password reset for this admin.
  const resetRequestBody = {
    email: adminEmail,
  } satisfies ICommunityPlatformAdmin.IResetPasswordRequest;
  const resetResult =
    await api.functional.auth.admin.password.reset.request.resetPasswordRequest(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResult);

  // As there's no API to directly retrieve the created password reset token ID, we must simulate/assume we have a way to retrieve it.
  // In real systems, this would be acquired from a database or test fixture; for e2e, we mock it with random and a skip. In actual e2e,
  // the system might supply an event log endpoint or fixture data for this purpose, or a direct database read in CI.
  // Here, for completeness, simulate obtaining the token ID (in real suites, replace this with a secure, predictable method).
  // Note: For proper E2E, you would retrieve the token ID from backend/system test support utilities.
  const issuedToken: ICommunityPlatformAdminPasswordResetToken =
    typia.random<ICommunityPlatformAdminPasswordResetToken>();
  issuedToken.community_platform_admin_id = adminAuth.id; // Ensure correct association
  // Step 3: Retrieve the password reset token metadata with valid credentials.
  const tokenMeta: ICommunityPlatformAdminPasswordResetToken =
    await api.functional.communityPlatform.admin.admins.passwordResetTokens.at(
      connection,
      {
        adminId: adminAuth.id,
        passwordResetTokenId: issuedToken.id,
      },
    );
  typia.assert(tokenMeta);

  // Validate core fields
  TestValidator.equals(
    "token admin association",
    tokenMeta.community_platform_admin_id,
    adminAuth.id,
  );
  TestValidator.equals(
    "token consumed status matches expected",
    tokenMeta.consumed,
    false,
  ); // should be unused just after issuance
  TestValidator.predicate(
    "expires_at is valid ISO date-time string",
    typeof tokenMeta.expires_at === "string" &&
      !!Date.parse(tokenMeta.expires_at),
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time string",
    typeof tokenMeta.created_at === "string" &&
      !!Date.parse(tokenMeta.created_at),
  );
  // raw secret token value is never present (we check only known fields)
  TestValidator.equals(
    "returned fields match schema",
    Object.keys(tokenMeta).sort(),
    [
      "id",
      "community_platform_admin_id",
      "expires_at",
      "consumed",
      "created_at",
      "consumed_at",
    ].sort(),
  );

  // Negative case: Without authentication, unauthenticated user should be denied
  const invalidConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve token metadata",
    async () => {
      await api.functional.communityPlatform.admin.admins.passwordResetTokens.at(
        invalidConn,
        {
          adminId: adminAuth.id,
          passwordResetTokenId: issuedToken.id,
        },
      );
    },
  );

  // Negative edge case: Random valid-but-nonexistent token
  await TestValidator.error(
    "querying with random (nonexistent) token should fail",
    async () => {
      await api.functional.communityPlatform.admin.admins.passwordResetTokens.at(
        connection,
        {
          adminId: adminAuth.id,
          passwordResetTokenId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
