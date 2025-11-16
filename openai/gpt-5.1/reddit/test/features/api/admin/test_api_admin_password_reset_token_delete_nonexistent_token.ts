import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

/**
 * Validate 404-style behavior when deleting a non-existent admin password reset
 * token.
 *
 * Business goal:
 *
 * - Ensure that the hard delete endpoint for password reset tokens reports a
 *   not-found style error (404) when a UUID does not correspond to any existing
 *   token record.
 * - Ensure that invoking DELETE with a non-existent id does not affect any
 *   existing tokens in the system.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via the join endpoint to establish an authenticated
 *    admin context. The SDK will automatically set the Authorization header
 *    using the returned access token.
 * 2. Create a valid password reset token for that admin account so that the
 *    password reset token table is known to contain at least one real row.
 * 3. Generate a random UUID that is guaranteed to differ from the created token's
 *    id (ensure inequality at runtime).
 * 4. Call the erase endpoint with the non-existent UUID and assert that it fails
 *    with an HTTP 404 error via TestValidator.httpError.
 * 5. Rely on the fact that we never call erase with the real token id, so the
 *    existing token is not deleted; since there is no read/search endpoint
 *    provided, we cannot re-fetch the token but we validate via typia.assert at
 *    creation time.
 */
export async function test_api_admin_password_reset_token_delete_nonexistent_token(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (admin join) to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a valid password reset token for this admin account
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const createBody = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: expiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken);

  // 3. Generate a non-existent UUID different from the created token id
  const nonExistentIdCandidate: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentId: string & tags.Format<"uuid"> =
    nonExistentIdCandidate === createdToken.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistentIdCandidate;

  TestValidator.notEquals(
    "non-existent id must differ from real token id",
    nonExistentId,
    createdToken.id,
  );

  // 4. Call erase with non-existent UUID and expect 404 HTTP error
  await TestValidator.httpError(
    "delete non-existent password reset token should yield 404 error",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.passwordResetTokens.erase(
        connection,
        {
          passwordResetTokenId: nonExistentId,
        },
      );
    },
  );

  // 5. Sanity check: created token is still a valid structure (cannot re-fetch)
  //    We rely on type-level assertion and the fact that we never call erase
  //    with the real token id, so no additional API call is needed here.
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken);
}
