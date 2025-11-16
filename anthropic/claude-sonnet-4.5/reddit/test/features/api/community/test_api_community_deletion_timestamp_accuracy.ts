import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that the deleted_at timestamp accurately reflects the exact moment of
 * deletion.
 *
 * This test validates the precision and accuracy of soft-delete timestamp
 * generation for community deletion operations. It ensures that when a
 * community is deleted via the DELETE
 * /redditCommunity/moderator/communities/{communityId} endpoint, the deleted_at
 * timestamp in the response accurately reflects the actual deletion time.
 *
 * Workflow:
 *
 * 1. Register a moderator account for authentication
 * 2. Create a test community to be deleted
 * 3. Record the time immediately before deletion
 * 4. Perform the deletion operation
 * 5. Validate the deleted_at timestamp is within a reasonable time window
 * 6. Confirm the timestamp follows ISO 8601 date-time format
 *
 * This ensures proper audit trail accuracy for community lifecycle management.
 */
export async function test_api_community_deletion_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community to be deleted
  // Generate lowercase alphanumeric community name matching pattern ^[a-z0-9_]+$
  const communityName =
    RandomGenerator.alphabets(5) +
    RandomGenerator.pick([..."0123456789"]) +
    RandomGenerator.alphabets(4);

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
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
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Record time before deletion (with small buffer for clock precision)
  const beforeDeletion = new Date();

  // Step 4: Perform the deletion operation
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityid(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 5: Record time after deletion
  const afterDeletion = new Date();

  // Step 6: Validate that deleted_at exists and is within reasonable time window
  TestValidator.predicate(
    "deleted_at timestamp should be set after deletion",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Parse the deleted_at timestamp with proper type narrowing
  typia.assertGuard<string & tags.Format<"date-time">>(
    deletedCommunity.deleted_at!,
  );
  const deletedAt = new Date(deletedCommunity.deleted_at);

  // Validate timestamp is within the time window (allowing 5 seconds buffer for processing)
  const timeBuffer = 5000; // 5 seconds in milliseconds
  const beforeWithBuffer = new Date(beforeDeletion.getTime() - timeBuffer);
  const afterWithBuffer = new Date(afterDeletion.getTime() + timeBuffer);

  TestValidator.predicate(
    "deleted_at timestamp should be within reasonable time window of deletion request",
    deletedAt >= beforeWithBuffer && deletedAt <= afterWithBuffer,
  );

  // Step 7: Verify the deleted_at follows ISO 8601 date-time format
  // The typia.assert already validates the format through tags.Format<"date-time">
  // Additional validation that the timestamp is parseable and valid
  TestValidator.predicate(
    "deleted_at should be a valid date-time",
    !isNaN(deletedAt.getTime()),
  );

  // Verify the community ID matches the original
  TestValidator.equals(
    "deleted community ID should match original",
    deletedCommunity.id,
    community.id,
  );
}
