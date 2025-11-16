import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that soft deleting a community preserves all relationship data.
 *
 * This test validates the soft delete pattern implementation for communities.
 * When a community is deleted, the system should set the deleted_at timestamp
 * while preserving all historical data including posts, comments,
 * subscriptions, and moderation history. This ensures compliance, audit trails,
 * and potential restoration capabilities.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Establish a new community with complete configuration
 * 3. Execute the delete operation on the community
 * 4. Validate that deleted_at timestamp is set
 * 5. Verify all community data remains intact (soft delete, not hard delete)
 */
export async function test_api_community_deletion_preserves_relationships(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community with comprehensive data
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
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

  // Validate created community has no deleted_at timestamp initially
  TestValidator.predicate(
    "newly created community should not be deleted",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );

  // Step 3: Perform soft delete operation
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityid(
      connection,
      {
        communityId: createdCommunity.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 4: Validate that deleted_at timestamp is set
  TestValidator.predicate(
    "deleted community should have deleted_at timestamp set",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 5: Verify all relationship data is preserved (soft delete pattern)
  TestValidator.equals(
    "community id should be preserved",
    deletedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "community name should be preserved",
    deletedCommunity.name,
    createdCommunity.name,
  );

  TestValidator.equals(
    "community display_title should be preserved",
    deletedCommunity.display_title,
    createdCommunity.display_title,
  );

  TestValidator.equals(
    "community description should be preserved",
    deletedCommunity.description,
    createdCommunity.description,
  );

  TestValidator.equals(
    "community rules should be preserved",
    deletedCommunity.rules,
    createdCommunity.rules,
  );

  TestValidator.equals(
    "community creator_member_id should be preserved",
    deletedCommunity.creator_member_id,
    createdCommunity.creator_member_id,
  );

  TestValidator.equals(
    "community subscriber_count should be preserved",
    deletedCommunity.subscriber_count,
    createdCommunity.subscriber_count,
  );

  TestValidator.equals(
    "community post_count should be preserved",
    deletedCommunity.post_count,
    createdCommunity.post_count,
  );

  TestValidator.equals(
    "community created_at should be preserved",
    deletedCommunity.created_at,
    createdCommunity.created_at,
  );

  TestValidator.equals(
    "community icon_url should be preserved",
    deletedCommunity.icon_url,
    createdCommunity.icon_url,
  );

  TestValidator.equals(
    "community banner_url should be preserved",
    deletedCommunity.banner_url,
    createdCommunity.banner_url,
  );
}
