import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Authenticate with a non-existent Community Owner account should fail.
 *
 * Objective:
 *
 * - Ensure POST /auth/communityOwner/login rejects credentials for users that do
 *   not exist.
 * - Use neutral error validation (no status code assertions) to align with
 *   anti-enumeration policy.
 *
 * Steps:
 *
 * 1. Attempt login by email with a random, non-existent address and a random
 *    password.
 * 2. Attempt login by username with a random, non-existent username and a random
 *    password.
 * 3. For both attempts, assert that an error is thrown.
 *
 * Notes:
 *
 * - Do not touch connection.headers at all; SDK manages auth internally.
 * - Do not perform type-error or missing-field testing; bodies are well-formed.
 */
export async function test_api_community_owner_login_user_not_found(
  connection: api.IConnection,
) {
  // 1) Email-based login attempt (non-existent principal)
  const emailAttemptBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunityOwner.ILogin;

  await TestValidator.error(
    "login with non-existent email must fail",
    async () => {
      await api.functional.auth.communityOwner.login(connection, {
        body: emailAttemptBody,
      });
    },
  );

  // 2) Username-based login attempt (non-existent principal)
  const usernameAttemptBody = {
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunityOwner.ILogin;

  await TestValidator.error(
    "login with non-existent username must fail",
    async () => {
      await api.functional.auth.communityOwner.login(connection, {
        body: usernameAttemptBody,
      });
    },
  );
}
