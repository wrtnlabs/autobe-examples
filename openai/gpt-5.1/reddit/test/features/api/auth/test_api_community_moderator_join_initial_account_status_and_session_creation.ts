import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate community moderator join creates authorized context and enforces
 * uniqueness.
 *
 * This test focuses on the publicly exposed POST /auth/communityModerator/join
 * endpoint. The underlying business requirement from the long description is
 * that a new row is inserted into community_platform_communitymoderators with a
 * proper initial account_status_id and that a corresponding
 * community_platform_communitymoderator_sessions row and security event are
 * created. However, since only the join API is available in this test scope and
 * there are no admin or inspection endpoints for statuses, sessions, or
 * security events, we validate behavior through the observable join response
 * and error behavior instead of direct table reads.
 *
 * Test steps:
 *
 * 1. Generate a unique and valid ICommunityPlatformCommunityModerator.IJoin
 *    payload using typia.random, overriding key fields to guarantee uniqueness
 *    and valid formats (email, href, referrer).
 * 2. Call api.functional.auth.communityModerator.join once with this payload and
 *    assert that the response conforms to
 *    ICommunityPlatformCommunityModerator.IAuthorized.
 * 3. Perform a second successful join with a different unique payload and verify
 *    that the two authorized contexts are distinct (different moderator ids and
 *    different JWT access tokens). This approximates that the backend creates
 *    separate moderator actors and sessions.
 * 4. Attempt to join again using the exact same username and email combination as
 *    the first join and verify that the backend rejects the request with an
 *    error, without asserting any specific HTTP status code.
 *
 * Business rules validated indirectly:
 *
 * - Join succeeds with a valid payload and returns an authorized moderator
 *   context and token bundle.
 * - Multiple moderators can be registered independently and receive distinct
 *   identifiers and token bundles, implying distinct account and session
 *   records.
 * - Username/email uniqueness constraints are enforced by the join endpoint,
 *   which is critical for the integrity of the
 *   community_platform_communitymoderators table.
 */
export async function test_api_community_moderator_join_initial_account_status_and_session_creation(
  connection: api.IConnection,
) {
  // 1. Prepare first unique join payload
  const baseJoin1 = typia.random<ICommunityPlatformCommunityModerator.IJoin>();
  const joinBody1 = {
    ...baseJoin1,
    // Ensure email uniqueness and correct format via tags.Format<"email">
    email: typia.random<string & tags.Format<"email">>(),
    // Ensure href and referrer are valid URI strings
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  // 2. First successful join
  const authorized1: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody1,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized1);

  // Basic sanity checks using TestValidator
  TestValidator.predicate(
    "first moderator id is a non-empty string",
    () => authorized1.id.length > 0,
  );
  TestValidator.predicate(
    "first moderator token.access is a non-empty string",
    () => authorized1.token.access.length > 0,
  );

  // 3. Second successful join with different unique payload
  const baseJoin2 = typia.random<ICommunityPlatformCommunityModerator.IJoin>();
  const joinBody2 = {
    ...baseJoin2,
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const authorized2: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody2,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized2);

  // Ensure different moderator actors and token bundles
  TestValidator.notEquals(
    "different joins must yield different moderator ids",
    authorized1.id,
    authorized2.id,
  );
  TestValidator.notEquals(
    "different joins must yield different access tokens",
    authorized1.token.access,
    authorized2.token.access,
  );

  // 4. Attempt duplicate join with same username and email as the first payload
  const duplicateJoinBody = {
    ...joinBody1,
    // Keep username and email identical to trigger uniqueness constraint
    username: joinBody1.username,
    email: joinBody1.email,
    // href/referrer can differ; they are not part of uniqueness rules
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  await TestValidator.error(
    "joining with duplicate username/email must fail",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: duplicateJoinBody,
      });
    },
  );
}
