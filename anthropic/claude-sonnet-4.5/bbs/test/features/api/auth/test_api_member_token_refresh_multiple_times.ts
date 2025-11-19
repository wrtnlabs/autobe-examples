import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test consecutive token refresh operations to verify refresh token
 * reusability.
 *
 * This test validates the token refresh workflow by performing multiple
 * consecutive refresh operations. It creates a member account, then executes
 * three sequential refresh operations, each using the refresh token obtained
 * from the previous operation. The test verifies that:
 *
 * 1. Create a member account and obtain initial tokens
 * 2. Perform first refresh using initial refresh token
 * 3. Verify first refresh returns new tokens with updated expiration
 * 4. Perform second refresh using the new refresh token
 * 5. Verify second refresh returns new tokens with updated expiration
 * 6. Perform third refresh to confirm the chain continues
 * 7. Validate expiration timestamps increase with each refresh
 * 8. Confirm member profile data remains consistent
 */
export async function test_api_member_token_refresh_multiple_times(
  connection: api.IConnection,
) {
  // Step 1: Create member account and obtain initial tokens
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const initialMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(initialMember);

  // Store initial token information for comparison
  const initialExpiredAt = initialMember.token.expired_at;
  const initialRefreshableUntil = initialMember.token.refreshable_until;

  // Step 2: Perform first token refresh
  const firstRefresh: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: initialMember.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(firstRefresh);

  // Step 3: Verify first refresh returns updated tokens
  TestValidator.equals(
    "first refresh member ID matches",
    firstRefresh.id,
    initialMember.id,
  );
  TestValidator.equals(
    "first refresh email matches",
    firstRefresh.email,
    initialMember.email,
  );
  TestValidator.predicate(
    "first refresh access token is different",
    firstRefresh.token.access !== initialMember.token.access,
  );
  TestValidator.predicate(
    "first refresh token expiration updated",
    new Date(firstRefresh.token.expired_at).getTime() >
      new Date(initialExpiredAt).getTime(),
  );

  // Step 4: Perform second token refresh using the new refresh token
  const secondRefresh: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: firstRefresh.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(secondRefresh);

  // Step 5: Verify second refresh returns updated tokens
  TestValidator.equals(
    "second refresh member ID matches",
    secondRefresh.id,
    initialMember.id,
  );
  TestValidator.equals(
    "second refresh username matches",
    secondRefresh.username,
    initialMember.username,
  );
  TestValidator.predicate(
    "second refresh access token is different from first",
    secondRefresh.token.access !== firstRefresh.token.access,
  );
  TestValidator.predicate(
    "second refresh token expiration updated from first",
    new Date(secondRefresh.token.expired_at).getTime() >=
      new Date(firstRefresh.token.expired_at).getTime(),
  );

  // Step 6: Perform third token refresh to confirm chain continues
  const thirdRefresh: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: secondRefresh.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(thirdRefresh);

  // Step 7: Validate third refresh token chain
  TestValidator.equals(
    "third refresh member ID matches",
    thirdRefresh.id,
    initialMember.id,
  );
  TestValidator.predicate(
    "third refresh access token is different from second",
    thirdRefresh.token.access !== secondRefresh.token.access,
  );
  TestValidator.predicate(
    "third refresh token expiration updated from second",
    new Date(thirdRefresh.token.expired_at).getTime() >=
      new Date(secondRefresh.token.expired_at).getTime(),
  );

  // Step 8: Verify overall token progression
  TestValidator.predicate(
    "final expiration is after initial expiration",
    new Date(thirdRefresh.token.expired_at).getTime() >
      new Date(initialExpiredAt).getTime(),
  );
  TestValidator.equals(
    "member profile data remains consistent",
    thirdRefresh.email,
    initialMember.email,
  );
}
