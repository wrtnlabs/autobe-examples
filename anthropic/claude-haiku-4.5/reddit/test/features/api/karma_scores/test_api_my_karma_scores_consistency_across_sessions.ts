import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that /my/karmaScores returns consistent data across multiple requests
 * within the same authenticated session.
 *
 * This test validates that the endpoint reliably reports the member's current
 * karma state without stale or inconsistent data. A member account is created,
 * their karma scores are retrieved multiple times, and consistency is verified
 * across all requests. The immutable created_at timestamp is checked to remain
 * unchanged, while updated_at reflects the current state.
 *
 * Steps:
 *
 * 1. Create a new member account through registration
 * 2. Retrieve karma scores for the newly created member (first request)
 * 3. Retrieve karma scores again (second request)
 * 4. Verify that karma values are identical across requests
 * 5. Verify that created_at timestamp is immutable and unchanged
 * 6. Verify that updated_at is consistent
 * 7. Perform a third retrieval to confirm sustained consistency
 * 8. Validate all karma score fields match expectations
 */
export async function test_api_my_karma_scores_consistency_across_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;
  const memberPassword = RandomGenerator.alphabets(12);

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(registeredMember);

  // Step 2: Retrieve karma scores - first request
  const firstKarmaScores = await api.functional.my.karmaScores.at(connection);
  typia.assert(firstKarmaScores);

  // Store the initial values for comparison
  const initialPostKarma = firstKarmaScores.post_karma;
  const initialCommentKarma = firstKarmaScores.comment_karma;
  const initialTotalKarma = firstKarmaScores.total_karma;
  const immutableCreatedAt = firstKarmaScores.created_at;
  const firstUpdatedAt = firstKarmaScores.updated_at;

  // Step 3: Retrieve karma scores - second request
  const secondKarmaScores = await api.functional.my.karmaScores.at(connection);
  typia.assert(secondKarmaScores);

  // Step 4: Verify karma values are identical across requests
  TestValidator.equals(
    "post_karma should be consistent across requests",
    firstKarmaScores.post_karma,
    secondKarmaScores.post_karma,
  );

  TestValidator.equals(
    "comment_karma should be consistent across requests",
    firstKarmaScores.comment_karma,
    secondKarmaScores.comment_karma,
  );

  TestValidator.equals(
    "total_karma should be consistent across requests",
    firstKarmaScores.total_karma,
    secondKarmaScores.total_karma,
  );

  // Step 5: Verify created_at timestamp is immutable
  TestValidator.equals(
    "created_at should remain immutable across requests",
    firstKarmaScores.created_at,
    secondKarmaScores.created_at,
  );

  // Step 6: Verify updated_at consistency
  TestValidator.equals(
    "updated_at should reflect consistent state",
    firstKarmaScores.updated_at,
    secondKarmaScores.updated_at,
  );

  // Step 7: Perform a third retrieval to confirm sustained consistency
  const thirdKarmaScores = await api.functional.my.karmaScores.at(connection);
  typia.assert(thirdKarmaScores);

  // Verify third request matches previous requests
  TestValidator.equals(
    "post_karma should match across three requests",
    secondKarmaScores.post_karma,
    thirdKarmaScores.post_karma,
  );

  TestValidator.equals(
    "comment_karma should match across three requests",
    secondKarmaScores.comment_karma,
    thirdKarmaScores.comment_karma,
  );

  TestValidator.equals(
    "total_karma should match across three requests",
    secondKarmaScores.total_karma,
    thirdKarmaScores.total_karma,
  );

  // Step 8: Validate all karma score fields match expectations
  TestValidator.predicate(
    "total_karma should equal sum of post_karma and comment_karma",
    thirdKarmaScores.total_karma ===
      thirdKarmaScores.post_karma + thirdKarmaScores.comment_karma,
  );

  TestValidator.predicate(
    "post_karma should be non-negative",
    thirdKarmaScores.post_karma >= 0,
  );

  TestValidator.predicate(
    "comment_karma should be non-negative",
    thirdKarmaScores.comment_karma >= 0,
  );

  TestValidator.predicate(
    "total_karma should be non-negative",
    thirdKarmaScores.total_karma >= 0,
  );

  TestValidator.predicate(
    "member_id should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      thirdKarmaScores.community_platform_member_id,
    ),
  );
}
