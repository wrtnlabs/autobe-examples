import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdminUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordReset";
import type { ICommunityPlatformAdminUserPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordResetRequest";

/**
 * Validate neutral business error when initiating admin password reset for an
 * unknown account.
 *
 * This test ensures that the provider rejects password reset initiation for
 * non-existent admin identities without leaking account existence information.
 * The request is performed without any Authorization header.
 *
 * Steps
 *
 * 1. Create an unauthenticated connection with empty headers.
 * 2. Attempt to initiate password reset with an unknown email; expect an error.
 * 3. Attempt again with an unknown username; expect an error.
 *
 * Notes
 *
 * - Do not assert specific HTTP status codes; only assert that an error occurs.
 * - Use the exact DTO variant for the body:
 *   ICommunityPlatformAdminUserPasswordResetRequest.ICreate.
 * - Never manipulate connection.headers beyond creating an empty object for
 *   unauthenticated calls.
 */
export async function test_api_admin_password_reset_request_unknown_account(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Construct guaranteed-unknown identifiers
  const unknownEmail = `noadmin_${RandomGenerator.alphaNumeric(16)}@example.com`;
  const unknownUsername = `noadmin_${RandomGenerator.alphaNumeric(16)}`;

  // 2) Unknown email should yield a business error (neutral handling)
  await TestValidator.error(
    "unknown admin email should be rejected neutrally",
    async () => {
      await api.functional.auth.adminUser.password.reset.requestPasswordReset(
        unauthConn,
        {
          body: {
            email: unknownEmail,
          } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // 3) Unknown username should also yield a business error (neutral handling)
  await TestValidator.error(
    "unknown admin username should be rejected neutrally",
    async () => {
      await api.functional.auth.adminUser.password.reset.requestPasswordReset(
        unauthConn,
        {
          body: {
            username: unknownUsername,
          } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate,
        },
      );
    },
  );
}
