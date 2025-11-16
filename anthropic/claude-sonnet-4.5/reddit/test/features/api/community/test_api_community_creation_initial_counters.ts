import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that newly created communities have properly initialized counter fields.
 *
 * This test validates that when a new community is created, all system-managed
 * counter fields and timestamps are correctly initialized to their expected
 * default values. This ensures data integrity and consistent initial state for
 * all new communities.
 *
 * Test Steps:
 *
 * 1. Authenticate as moderator to obtain required JWT tokens
 * 2. Create a new community with valid community data
 * 3. Verify subscriber_count is initialized to 0
 * 4. Verify post_count is initialized to 0
 * 5. Verify updated_at matches created_at initially
 * 6. Verify deleted_at is null/undefined for active community
 */
export async function test_api_community_creation_initial_counters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to obtain JWT tokens
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const authenticatedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create a new community with valid data
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Verify subscriber_count is initialized to 0
  TestValidator.equals(
    "subscriber_count should be initialized to 0",
    createdCommunity.subscriber_count,
    0,
  );

  // Step 4: Verify post_count is initialized to 0
  TestValidator.equals(
    "post_count should be initialized to 0",
    createdCommunity.post_count,
    0,
  );

  // Step 5: Verify updated_at matches created_at initially
  TestValidator.equals(
    "updated_at should match created_at for newly created community",
    createdCommunity.updated_at,
    createdCommunity.created_at,
  );

  // Step 6: Verify deleted_at is null or undefined for active community
  TestValidator.predicate(
    "deleted_at should be null or undefined for active community",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
