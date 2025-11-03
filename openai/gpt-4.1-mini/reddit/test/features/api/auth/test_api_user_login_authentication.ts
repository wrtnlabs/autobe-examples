import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Test user authentication via login endpoint.
 *
 * This E2E test performs the following sequence:
 *
 * 1. User account registration using the join endpoint with valid credentials and
 *    session metadata.
 * 2. User login via the login endpoint with the same credentials.
 * 3. Assertion that login succeeds, returning a valid authorized user object
 *    including JWT token.
 *
 * The test verifies the login mechanism is dependent on successful registration
 * and returns expected JWT tokens. It ensures realistic test data for email and
 * connection URIs.
 *
 * This comprehensive test validates the authentication paths for user
 * onboarding and access.
 */
export async function test_api_user_login_authentication(
  connection: api.IConnection,
) {
  // Generate realistic test data for user registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "validPassword123";
  const testHref = RandomGenerator.pick([
    "https://example.com/current",
    "https://reddit.com/home",
    "https://app.local/dashboard",
  ]) as string & tags.Format<"uri">;
  const testReferrer = RandomGenerator.pick([
    "https://example.com",
    "https://google.com",
    "https://reddit.com",
  ]) as string & tags.Format<"uri">;

  // 1. User account registration
  const createUserBody = {
    email: testEmail,
    password: testPassword,
    ip: null,
    href: testHref,
    referrer: testReferrer,
  } satisfies IRedditCommunityUser.ICreate;

  const createdUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(createdUser);

  TestValidator.equals("joined user email", createdUser.email, testEmail);
  TestValidator.predicate(
    "join token has access",
    typeof createdUser.token.access === "string",
  );

  // 2. User login
  const loginUserBody = {
    email: testEmail,
    password: testPassword,
    ip: null,
    href: testHref,
    referrer: testReferrer,
  } satisfies IRedditCommunityUser.ILogin;

  const loggedInUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginUserBody,
    });
  typia.assert(loggedInUser);

  TestValidator.equals("logged in user email", loggedInUser.email, testEmail);
  TestValidator.predicate(
    "login token has access",
    typeof loggedInUser.token.access === "string",
  );
}
