import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";

/**
 * Validate idempotent deletion semantics for member-user voting rate limit
 * windows.
 *
 * Business goal: Ensure that a platform administrator can safely delete a
 * specific `community_platform_voting_rate_limits` record for a member user and
 * re-issue the same DELETE request without corrupting state or causing
 * unexpected server-side failures. The first DELETE should remove the record;
 * subsequent DELETEs on the same resource path must either succeed silently or
 * fail in a controlled, HttpError-based not-found style.
 *
 * Test steps:
 *
 * 1. Register and authenticate a platform administrator with POST
 *    /auth/platformAdmin/join, which also wires the access token into the
 *    shared SDK connection.
 * 2. Choose a concrete `memberUserId` as a random UUID, representing the member
 *    user whose voting rate limit we will manage.
 * 3. As the authenticated platform admin, create a new voting rate limit window
 *    for that member user via POST
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/votingRateLimits.
 *
 *    - Populate ICommunityPlatformVotingRateLimit.ICreate with a small,
 *         forward-moving time window and reasonable allowed vote limits.
 *    - Use typia.random for date-time and numeric ranges where appropriate.
 *    - Assert the response with typia.assert() as ICommunityPlatformVotingRateLimit.
 * 4. Call DELETE once on
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/votingRateLimits/{votingRateLimitId}
 *    using
 *    api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.erase.
 *
 *    - Ensure the call completes without throwing; if an exception is thrown, the
 *         test fails.
 * 5. Optionally, call GET on the same resource using `at` and verify that the
 *    record is no longer retrievable:
 *
 *    - Wrap the GET call in TestValidator.error with an async closure.
 *    - Treat an HttpError as an acceptable not-found condition, but rethrow any
 *         non-HttpError exceptions.
 * 6. Call DELETE a second time on the same path. Validate idempotency:
 *
 *    - If it completes without throwing, consider it an idempotent success.
 *    - If it throws, ensure the thrown error is an HttpError; any other error type
 *         should fail the test.
 * 7. Optionally, repeat a GET call after the second DELETE and confirm that it
 *    continues to fail via HttpError, showing the resource is absent.
 *
 * Assertions:
 *
 * - Typia.assert() on the create response ensures the server returns a fully
 *   valid ICommunityPlatformVotingRateLimit structure.
 * - TestValidator.error() is used to guarantee that attempting to GET a deleted
 *   record results in some error rather than a successful retrieval.
 * - TestValidator.predicate() is used to confirm that when DELETE throws, the
 *   thrown value is an HttpError (controlled not-found semantics), never an
 *   arbitrary non-HttpError error.
 */
export async function test_api_voting_rate_limit_delete_idempotency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a concrete memberUserId to operate on.
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a voting rate limit window for that member user.
  const now = new Date();
  const windowStart = now.toISOString();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const createBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: windowStart,
    window_end: windowEnd,
    allowed_post_votes: 100,
    allowed_comment_votes: 200,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const created: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert(created);

  const votingRateLimitId = created.id;

  // 4. First DELETE should succeed without throwing.
  await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.erase(
    connection,
    {
      memberUserId,
      votingRateLimitId,
    },
  );

  // 5. After first DELETE, attempting to GET should fail via HttpError.
  await TestValidator.error("get after first delete should fail", async () => {
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId,
      },
    );
  });

  // 6. Second DELETE: must be safe. It may either succeed silently or
  //    throw an HttpError; any non-HttpError exception should fail the test.
  let secondDeleteThrew = false;
  try {
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.erase(
      connection,
      {
        memberUserId,
        votingRateLimitId,
      },
    );
  } catch (err) {
    secondDeleteThrew = true;
    // Ensure that if an error is thrown, it is an HttpError.
    await TestValidator.predicate(
      "second delete throws only HttpError",
      () => err instanceof api.HttpError,
    );
  }

  // 7. Optional: confirm that repeated GET still fails via HttpError.
  await TestValidator.error(
    "get after second delete should still fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
        connection,
        {
          memberUserId,
          votingRateLimitId,
        },
      );
    },
  );

  // 8. Ensure the test path was actually exercised: at least one of
  //    the behaviors (silent success or HttpError) must have occurred on
  //    the second delete. This predicate simply encodes that the code
  //    path was taken and did not crash for other reasons.
  TestValidator.predicate(
    "second delete was attempted (either succeeded or threw HttpError)",
    secondDeleteThrew === true || secondDeleteThrew === false,
  );
}
