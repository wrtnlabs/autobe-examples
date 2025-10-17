import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorLogin";

/**
 * Deny login for non-existent community moderator accounts without leaking
 * account existence.
 *
 * Business goal: Ensure that POST /auth/communityModerator/login rejects
 * authentication when the provided identifier (email or username) does not
 * correspond to any existing account. The error response must be
 * indistinguishable regardless of identifier validity (neutral messaging) to
 * prevent user enumeration.
 *
 * What this test validates
 *
 * 1. Attempt login by email with random, unknown credentials → must throw an error
 * 2. Attempt login by username with random, unknown credentials → must throw an
 *    error
 *
 * Important constraints
 *
 * - Do NOT inspect HTTP status codes or error payloads; only assert that an error
 *   occurs.
 * - Do NOT access or manipulate connection.headers; SDK manages tokens
 *   internally.
 * - Use strictly valid DTO shapes (no type-error testing like short passwords or
 *   malformed emails).
 */
export async function test_api_community_moderator_login_unknown_user(
  connection: api.IConnection,
) {
  // Arrange: build random credentials for unknown user (email variant)
  const unknownEmail = typia.random<string & tags.Format<"email">>();
  const password1 = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<64>
  >();

  // Act + Assert: expect login-by-email to fail for unknown account
  await TestValidator.error(
    "unknown moderator email cannot login",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: unknownEmail,
          password: password1,
        } satisfies ICommunityPlatformCommunityModeratorLogin.IRequest,
      });
    },
  );

  // Arrange: build random credentials for unknown user (username variant)
  const unknownUsername = RandomGenerator.alphabets(12);
  const password2 = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<64>
  >();

  // Act + Assert: expect login-by-username to fail for unknown account
  await TestValidator.error(
    "unknown moderator username cannot login",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          username: unknownUsername,
          password: password2,
        } satisfies ICommunityPlatformCommunityModeratorLogin.IRequest,
      });
    },
  );
}
