import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the complete workflow of a moderator permanently deleting a community.
 *
 * This test validates the soft delete mechanism where the community is marked
 * as deleted via the deleted_at timestamp while preserving historical data for
 * audit purposes.
 *
 * Test workflow:
 *
 * 1. Create moderator account through registration
 * 2. Create a new community
 * 3. Delete the community using its unique name identifier
 * 4. Verify the delete response returns the community entity with deleted_at
 *    timestamp
 * 5. Confirm the community data integrity is preserved after soft deletion
 */
export async function test_api_community_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and obtain authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const createdCommunity: IRedditCommunityCommunity =
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
  typia.assert(createdCommunity);

  // Verify community was created successfully
  TestValidator.equals(
    "created community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.predicate(
    "community initially not deleted",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );

  // Step 3: Delete the community using its unique name
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityname(
      connection,
      {
        communityName: createdCommunity.name,
      },
    );
  typia.assert(deletedCommunity);

  // Step 4: Verify the delete response contains the community with deleted_at timestamp
  TestValidator.equals(
    "deleted community ID matches",
    deletedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "deleted community name matches",
    deletedCommunity.name,
    createdCommunity.name,
  );

  // Step 5: Confirm deleted_at field is set
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Verify data integrity - all original community data is preserved
  TestValidator.equals(
    "display title preserved",
    deletedCommunity.display_title,
    createdCommunity.display_title,
  );
  TestValidator.equals(
    "description preserved",
    deletedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "rules preserved",
    deletedCommunity.rules,
    createdCommunity.rules,
  );
  TestValidator.equals(
    "creator member ID preserved",
    deletedCommunity.creator_member_id,
    createdCommunity.creator_member_id,
  );
}
