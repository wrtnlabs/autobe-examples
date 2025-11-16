import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

/**
 * Validate admin-only access and not-found behavior for password reset token
 * retrieval.
 *
 * Business intent:
 *
 * - Ensure that only authenticated adminUser actors can retrieve password reset
 *   token records.
 * - Ensure that unauthenticated calls fail when Authorization is absent.
 * - Ensure that using a random, non-existent but well-formed token UUID fails
 *   without breaking type safety.
 * - Ensure that valid tokens remain retrievable, confirming that negative-path
 *   tests do not corrupt normal behavior.
 *
 * High-level flow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join, obtaining an authorized
 *    admin context.
 * 2. Under this admin context, create a password reset token via POST
 *    /communityPlatform/adminUser/passwordResetTokens.
 * 3. From an unauthenticated connection, attempt to retrieve a token and expect an
 *    error.
 * 4. From the authenticated admin connection, attempt to retrieve a non-existent
 *    token id and expect an error.
 * 5. Finally, retrieve the real token id and validate that the data matches what
 *    was created.
 */
export async function test_api_admin_password_reset_token_retrieval_unauthorized_and_not_found_cases(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a real password reset token record under the authenticated admin context.
  const tokenCreateBody = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: tokenCreateBody,
      },
    );
  typia.assert(createdToken);

  // 3. Attempt unauthorized access (no Authorization header) and expect an error.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated adminUser cannot retrieve password reset tokens",
    async () => {
      await api.functional.communityPlatform.adminUser.passwordResetTokens.at(
        unauthenticatedConnection,
        {
          passwordResetTokenId: createdToken.id,
        },
      );
    },
  );

  // 4. Attempt to retrieve a non-existent token id as an authenticated adminUser and expect an error.
  const randomNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure we are still authenticated as the adminUser (join already set Authorization).
  await TestValidator.error(
    "retrieving non-existent password reset token id should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.passwordResetTokens.at(
        connection,
        {
          passwordResetTokenId: randomNonExistentId,
        },
      );
    },
  );

  // 5. Retrieve the existing token successfully and validate its content.
  const fetchedToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.at(
      connection,
      {
        passwordResetTokenId: createdToken.id,
      },
    );
  typia.assert(fetchedToken);

  TestValidator.equals(
    "fetched token id should match created token id",
    fetchedToken.id,
    createdToken.id,
  );

  TestValidator.equals(
    "fetched token account_id should match created token account_id",
    fetchedToken.account_id,
    createdToken.account_id,
  );

  TestValidator.equals(
    "fetched token purpose should match created token purpose",
    fetchedToken.purpose,
    createdToken.purpose,
  );
}
