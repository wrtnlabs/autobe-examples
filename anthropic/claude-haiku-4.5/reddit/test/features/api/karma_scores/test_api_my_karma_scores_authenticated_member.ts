import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_my_karma_scores_authenticated_member(
  connection: api.IConnection,
) {
  // Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;
  const memberPassword = RandomGenerator.alphabets(12);

  const memberData = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  // Join as a new member (this authenticates the connection)
  const joinResponse = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(joinResponse);

  // Verify the join response has proper authorization token
  TestValidator.predicate(
    "join response should contain valid access token",
    joinResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "join response should contain valid refresh token",
    joinResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "join response should contain member ID",
    joinResponse.id.length > 0,
  );

  // Retrieve authenticated member's karma scores using /my/karmaScores endpoint
  const karmaScores = await api.functional.my.karmaScores.at(connection);
  typia.assert(karmaScores);

  // Validate karma score structure and values
  TestValidator.predicate(
    "karma score should have valid member ID",
    karmaScores.community_platform_member_id.length > 0,
  );

  TestValidator.predicate(
    "post karma should be non-negative",
    karmaScores.post_karma >= 0,
  );

  TestValidator.predicate(
    "comment karma should be non-negative",
    karmaScores.comment_karma >= 0,
  );

  TestValidator.predicate(
    "total karma should equal post_karma plus comment_karma",
    karmaScores.total_karma ===
      karmaScores.post_karma + karmaScores.comment_karma,
  );

  // Validate timestamps are valid ISO 8601 dates
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      karmaScores.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      karmaScores.updated_at,
    ),
  );

  // Verify security isolation - the member ID in karma scores matches the authenticated member
  TestValidator.equals(
    "karma score member ID should match authenticated member ID",
    karmaScores.community_platform_member_id,
    joinResponse.id,
  );

  // For a newly created member, karma should be initialized to 0
  TestValidator.equals(
    "newly created member should have 0 post karma",
    karmaScores.post_karma,
    0,
  );

  TestValidator.equals(
    "newly created member should have 0 comment karma",
    karmaScores.comment_karma,
    0,
  );

  TestValidator.equals(
    "newly created member should have 0 total karma",
    karmaScores.total_karma,
    0,
  );
}
