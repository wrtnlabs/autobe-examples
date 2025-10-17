import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Wrong-password login rejection for community owner authentication.
 *
 * Purpose
 *
 * - Ensure POST /auth/communityOwner/login rejects authentication when the
 *   identifier (email or username) is correct but the password is wrong.
 *
 * Steps
 *
 * 1. Register a new community owner via POST /auth/communityOwner/join with valid
 *    ICommunityPlatformCommunityOwner.ICreate payload.
 * 2. Attempt login using the same email but an incorrect password and expect an
 *    error.
 * 3. Attempt login using the same username but an incorrect password and expect an
 *    error.
 *
 * Validation
 *
 * - Typia.assert on the successful join response (IAuthorized).
 * - Use TestValidator.error for wrong password attempts without asserting HTTP
 *   status codes.
 */
export async function test_api_community_owner_login_wrong_password(
  connection: api.IConnection,
) {
  // Prepare unique identifiers and compliant payload values
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `co_${RandomGenerator.alphaNumeric(8)}`; // pattern ^[A-Za-z0-9_]{3,20}$
  const passwordOk: string = RandomGenerator.alphaNumeric(12); // 8-64 chars
  const nowIso: string = new Date().toISOString();

  // 1) Register community owner (JOIN)
  const joinBody = {
    email,
    username,
    password: passwordOk,
    display_name: RandomGenerator.name(),
    // Optional avatar URI
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  const authorized = await api.functional.auth.communityOwner.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Wrong password login attempt using email
  const wrongPassword1: string = `${passwordOk}x`; // ensure wrong but valid length
  const loginWrongByEmail = {
    email,
    password: wrongPassword1,
  } satisfies ICommunityPlatformCommunityOwner.ILogin;

  await TestValidator.error(
    "login with correct email but wrong password must fail",
    async () => {
      await api.functional.auth.communityOwner.login(connection, {
        body: loginWrongByEmail,
      });
    },
  );

  // 3) Wrong password login attempt using username
  const wrongPassword2: string = `${passwordOk}y`; // another wrong password
  const loginWrongByUsername = {
    username,
    password: wrongPassword2,
  } satisfies ICommunityPlatformCommunityOwner.ILogin;

  await TestValidator.error(
    "login with correct username but wrong password must fail",
    async () => {
      await api.functional.auth.communityOwner.login(connection, {
        body: loginWrongByUsername,
      });
    },
  );
}
