import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful login for an existing registered member.
 *
 * This test covers the full workflow:
 *
 * 1. Member registration with unique credentials
 * 2. Member login using the registered credentials
 * 3. Validation of the returned authorized member info and JWT tokens
 * 4. Ensuring that the login tokens provide access credentials for subsequent API
 *    calls
 */
export async function test_api_member_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Generate unique user credentials
  const email = `user_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = `pass_${RandomGenerator.alphaNumeric(10)}`;
  const nickname = RandomGenerator.name();

  // 2. Register the member
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        nickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Login with the registered member credentials
  const loginToken: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email,
        password,
        ip: null,
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(loginToken);

  // 4. Validate the returned member ID is same with registration
  TestValidator.equals(
    "login member id should match registered member id",
    loginToken.id,
    member.id,
  );

  // 5. Validate JWT token structure
  TestValidator.predicate(
    "access token is non-empty string",
    typeof loginToken.token.access === "string" &&
      loginToken.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof loginToken.token.refresh === "string" &&
      loginToken.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid date-time string",
    typeof loginToken.token.expired_at === "string" &&
      !isNaN(Date.parse(loginToken.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date-time string",
    typeof loginToken.token.refreshable_until === "string" &&
      !isNaN(Date.parse(loginToken.token.refreshable_until)),
  );
}
