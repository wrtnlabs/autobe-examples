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
 * Test user registration by joining a new user context.
 *
 * This test validates that a new user can successfully register by submitting
 * necessary details including a valid email, password, and session context
 * information such as client IP, current page URL (href), and referrer URL.
 * Upon registration, the system must issue valid JWT access and refresh tokens,
 * enabling immediate authenticated operations without prior login.
 *
 * Steps:
 *
 * 1. Prepare valid registration data adhering to DTO constraints.
 * 2. Call the user join API endpoint with this data.
 * 3. Assert that the response payload matches the authorized user structure.
 * 4. Verify that the authorization token contains access and refresh tokens along
 *    with proper expiration timestamps.
 * 5. Confirm the returned user's email matches the submitted email.
 */
export async function test_api_user_join_registration(
  connection: api.IConnection,
) {
  // 1. Prepare user registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const ip = ArrayUtil.repeat(
    4,
    () =>
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
      >() + "",
  ).join(".");
  const href = `https://example.com/${RandomGenerator.alphabets(5)}`;
  const referrer = `https://referrer.com/${RandomGenerator.alphabets(7)}`;

  const requestBody = {
    email: email,
    password: password,
    ip: ip,
    href: href,
    referrer: referrer,
  } satisfies IRedditCommunityUser.ICreate;

  // 2. Perform user join API call
  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: requestBody });

  // 3. Assert response type correctness
  typia.assert(authorizedUser);

  // 4. Validate token presence and properties
  TestValidator.predicate(
    "Valid authorization token - access",
    authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "Valid authorization token - refresh",
    authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Authorization token expired_at is ISO date",
    typeof authorizedUser.token.expired_at === "string" &&
      authorizedUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Authorization token refreshable_until is ISO date",
    typeof authorizedUser.token.refreshable_until === "string" &&
      authorizedUser.token.refreshable_until.length > 0,
  );

  // 5. Validate returned user email matches request
  TestValidator.equals(
    "Returned user email matches request",
    authorizedUser.email,
    email,
  );
}
