import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * Validate member login rejects invalid credentials without leaking account
 * existence.
 *
 * Business context:
 *
 * - Members register via POST /auth/member/join and then authenticate via POST
 *   /auth/member/login using an identifier (username or email) and password.
 *
 * This E2E test performs the following:
 *
 * 1. Create a member account via the join endpoint
 * 2. Attempt login with the correct identifier but incorrect password (expect
 *    failure)
 * 3. Attempt login with an unknown identifier (expect failure)
 * 4. Repeat failed attempts to exercise potential rate-limiting behavior (expect
 *    failure each time)
 *
 * Notes:
 *
 * - The test asserts that invalid authentication attempts throw errors (using
 *   TestValidator.error) and that successful registration returns a valid
 *   ICommunityPortalMember.IAuthorized object.
 * - The test does NOT assert specific HTTP status codes or error messages to
 *   avoid coupling to implementation details.
 */
export async function test_api_member_login_invalid_credentials_unauthorized(
  connection: api.IConnection,
) {
  // 1) Prepare fixture: register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = "P@ssw0rd!"; // valid-typed password for registration

  const created = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPortalMember.ICreate,
  });
  typia.assert(created);

  // Business-level sanity: created username should match requested username
  TestValidator.equals(
    "created username matches input",
    created.username,
    memberUsername,
  );

  // 2) Attempt login with correct identifier but incorrect password
  await TestValidator.error(
    "login with known identifier but wrong password should be rejected",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          identifier: memberEmail,
          password: memberPassword + "_wrong",
        } satisfies ICommunityPortalMember.ILogin,
      });
    },
  );

  // 3) Attempt login with unknown identifier
  const unknownIdentifier = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "login with unknown identifier should be rejected",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          identifier: unknownIdentifier,
          password: "doesnotmatter",
        } satisfies ICommunityPortalMember.ILogin,
      });
    },
  );

  // 4) Repeated failed attempts (rate-limiting consideration). Each attempt must fail.
  for (let attempt = 1; attempt <= 3; ++attempt) {
    await TestValidator.error(
      `repeated failed login attempt #${attempt} should be rejected`,
      async () => {
        await api.functional.auth.member.login(connection, {
          body: {
            identifier: memberEmail,
            password: `invalid-${attempt}`,
          } satisfies ICommunityPortalMember.ILogin,
        });
      },
    );
  }
}
