import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that soft deletion preserves final community metrics including
 * subscriber_count and post_count.
 *
 * This test validates the critical business requirement that when a community
 * is soft-deleted, its metrics remain intact for historical records and
 * post-deletion analytics. The test creates a moderator account, establishes a
 * community, captures its current metrics, performs deletion, and verifies that
 * subscriber_count and post_count are preserved in their final state.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a new community (initializes with default metrics)
 * 3. Capture the community's current subscriber_count and post_count
 * 4. Execute soft deletion of the community
 * 5. Verify the deletion response includes the full community entity
 * 6. Validate that subscriber_count and post_count are preserved
 * 7. Confirm deleted_at timestamp is set
 */
export async function test_api_community_deletion_metrics_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a new community with properly constrained name
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
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Capture current metrics before deletion
  const preDeleteSubscriberCount = createdCommunity.subscriber_count;
  const preDeletePostCount = createdCommunity.post_count;

  // Step 4: Execute soft deletion of the community
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityid(
      connection,
      {
        communityId: createdCommunity.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 5: Verify deletion response includes the full community entity
  TestValidator.equals(
    "deleted community ID matches created community",
    deletedCommunity.id,
    createdCommunity.id,
  );

  // Step 6: Validate that metrics are preserved
  TestValidator.equals(
    "subscriber_count preserved after deletion",
    deletedCommunity.subscriber_count,
    preDeleteSubscriberCount,
  );

  TestValidator.equals(
    "post_count preserved after deletion",
    deletedCommunity.post_count,
    preDeletePostCount,
  );

  // Step 7: Confirm soft deletion occurred (deleted_at is set)
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );
}
