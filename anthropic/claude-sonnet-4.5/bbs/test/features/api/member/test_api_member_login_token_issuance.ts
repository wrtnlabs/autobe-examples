import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login token issuance functionality.
 *
 * This test validates that the member login API correctly issues fresh JWT
 * tokens with proper structure and expiration timestamps. The test ensures that
 * each login generates new tokens (not reusing previous session tokens) and
 * that all token fields are present with appropriate future expiration times.
 *
 * Test workflow:
 *
 * 1. Register a new member account using the join API
 * 2. Login with the registered member credentials
 * 3. Validate that new JWT tokens are issued with complete structure
 * 4. Verify the presence of access token, refresh token, expired_at, and
 *    refreshable_until fields
 * 5. Confirm that expiration timestamps are set to appropriate future times
 * 6. Ensure each login generates fresh tokens with different values
 */
export async function test_api_member_login_token_issuance(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.name();

  const joinRequestBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(registeredMember);

  // Validate registration response contains initial token
  TestValidator.predicate(
    "registration response contains token structure",
    registeredMember.token !== null && registeredMember.token !== undefined,
  );
  typia.assert(registeredMember.token);

  // Step 2: First login - validate fresh token issuance
  const firstLoginRequestBody = {
    email: memberEmail,
    password: memberPassword,
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ILogin;

  const firstLoginResult: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: firstLoginRequestBody,
    });
  typia.assert(firstLoginResult);

  // Step 3: Validate complete token structure
  const firstToken: IAuthorizationToken = firstLoginResult.token;
  typia.assert(firstToken);

  TestValidator.predicate(
    "access token is present and non-empty",
    firstToken.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present and non-empty",
    firstToken.refresh.length > 0,
  );

  // Step 4: Validate expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(firstToken.expired_at);
  const refreshableUntil = new Date(firstToken.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );

  // Step 5: Second login - validate new tokens are issued (not reused)
  const secondLoginRequestBody = {
    email: memberEmail,
    password: memberPassword,
    href: "https://example.com/login-again" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/dashboard" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ILogin;

  const secondLoginResult: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: secondLoginRequestBody,
    });
  typia.assert(secondLoginResult);

  const secondToken: IAuthorizationToken = secondLoginResult.token;
  typia.assert(secondToken);

  // Step 6: Verify that new tokens are different from previous login
  TestValidator.notEquals(
    "access token is fresh on second login",
    firstToken.access,
    secondToken.access,
  );

  TestValidator.notEquals(
    "refresh token is fresh on second login",
    firstToken.refresh,
    secondToken.refresh,
  );

  // Validate second login tokens also have future expiration times
  const nowSecondCheck = new Date();
  const secondExpiredAt = new Date(secondToken.expired_at);
  const secondRefreshableUntil = new Date(secondToken.refreshable_until);

  TestValidator.predicate(
    "second login access token expiration is in the future",
    secondExpiredAt.getTime() > nowSecondCheck.getTime(),
  );

  TestValidator.predicate(
    "second login refresh token expiration is in the future",
    secondRefreshableUntil.getTime() > nowSecondCheck.getTime(),
  );
}
