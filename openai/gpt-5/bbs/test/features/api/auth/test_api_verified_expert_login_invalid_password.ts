import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertLogin";

/**
 * Reject authentication with an incorrect password, then verify that a
 * subsequent login with the correct password succeeds.
 *
 * Steps:
 *
 * 1. Create a verified expert account via join (seed account for the test).
 * 2. Attempt to login with the same email but an invalid password and expect an
 *    error.
 * 3. Retry login with the correct password and verify success; confirm the subject
 *    id matches the joined account.
 */
export async function test_api_verified_expert_login_invalid_password(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated connection clone (SDK manages headers afterwards)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Controlled credentials satisfying DTO constraints
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName = RandomGenerator.name(2); // 2-word display name within limits

  // 1) Seed account via join
  const joinBody = {
    email,
    password: correctPassword,
    display_name: displayName,
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const joined = await api.functional.auth.verifiedExpert.join(unauthConn, {
    body: joinBody,
  });
  typia.assert(joined);

  // Generate an incorrect password (ensure difference from the correct one)
  let wrongPassword = RandomGenerator.alphaNumeric(12);
  if (wrongPassword === correctPassword) wrongPassword = `${wrongPassword}x`;

  // 2) Negative login attempt with wrong password → expect error
  await TestValidator.error(
    "login rejects invalid password",
    async () =>
      await api.functional.auth.verifiedExpert.login(unauthConn, {
        body: {
          email,
          password: wrongPassword,
        } satisfies IEconDiscussVerifiedExpertLogin.ICreate,
      }),
  );

  // 3) Positive login attempt with correct password → expect success
  const authorized = await api.functional.auth.verifiedExpert.login(
    unauthConn,
    {
      body: {
        email,
        password: correctPassword,
      } satisfies IEconDiscussVerifiedExpertLogin.ICreate,
    },
  );
  typia.assert(authorized);

  // Business validation: logged-in subject should equal the joined account id
  TestValidator.equals(
    "successful login returns the same subject id",
    authorized.id,
    joined.id,
  );
}
