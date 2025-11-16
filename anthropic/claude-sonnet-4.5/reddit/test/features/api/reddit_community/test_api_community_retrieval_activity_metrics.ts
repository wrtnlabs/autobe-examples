import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that community retrieval returns accurate activity metrics
 * (subscriber_count and post_count).
 *
 * This test validates that newly created communities have properly initialized
 * activity metrics:
 *
 * 1. Authenticate as moderator to create test community
 * 2. Create a new community with valid data
 * 3. Retrieve the community by name
 * 4. Verify subscriber_count is 0 (no subscribers yet)
 * 5. Verify post_count is 0 (no posts yet)
 * 6. Ensure these counters are included in the GET response
 *
 * This ensures activity metrics are properly exposed for community evaluation
 * and discovery.
 */
export async function test_api_community_retrieval_activity_metrics(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain community creation permissions
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a new community with valid community data
  const communityData = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-z0-9_]+$">
    >(),
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 8, wordMin: 3, wordMax: 6 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Retrieve the community by name to verify activity metrics
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: createdCommunity.name,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate that subscriber_count is 0 for newly created community
  TestValidator.equals(
    "newly created community should have 0 subscribers",
    retrievedCommunity.subscriber_count,
    0,
  );

  // Step 5: Validate that post_count is 0 for newly created community
  TestValidator.equals(
    "newly created community should have 0 posts",
    retrievedCommunity.post_count,
    0,
  );

  // Step 6: Verify that the retrieved community matches the created community
  TestValidator.equals(
    "retrieved community ID should match created community ID",
    retrievedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "retrieved community name should match created community name",
    retrievedCommunity.name,
    createdCommunity.name,
  );

  TestValidator.equals(
    "retrieved community display title should match created community",
    retrievedCommunity.display_title,
    createdCommunity.display_title,
  );
}
