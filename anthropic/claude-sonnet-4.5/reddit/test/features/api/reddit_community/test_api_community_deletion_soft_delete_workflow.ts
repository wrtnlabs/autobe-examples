import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the complete soft deletion workflow for communities.
 *
 * This test validates the full lifecycle of community soft deletion, from
 * moderator registration through community creation to final deletion. It
 * ensures that:
 *
 * 1. Moderator account registration succeeds with valid credentials
 * 2. Community creation succeeds with proper authentication
 * 3. Soft delete operation sets deleted_at timestamp correctly
 * 4. All immutable fields (id, name, created_at) are preserved
 * 5. Community data remains in database (soft delete, not hard delete)
 * 6. Final state metrics (subscriber_count, post_count) are maintained
 *
 * This workflow validates the audit trail functionality that allows communities
 * to be removed from public view while preserving historical data for
 * compliance and potential recovery.
 */
export async function test_api_community_deletion_soft_delete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account with administrative privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Validate moderator registration response
  TestValidator.predicate("moderator has valid UUID", moderator.id.length > 0);
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator nickname matches input",
    moderator.nickname,
    moderatorNickname,
  );

  // Step 2: Create a community with proper metadata
  const communityName = RandomGenerator.alphabets(10);
  const communityDisplayTitle = RandomGenerator.paragraph({ sentences: 2 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const communityRules = RandomGenerator.paragraph({ sentences: 3 });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: communityDisplayTitle,
          description: communityDescription,
          rules: communityRules,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Validate community creation
  TestValidator.predicate("community has valid UUID", community.id.length > 0);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community display title matches input",
    community.display_title,
    communityDisplayTitle,
  );
  TestValidator.equals(
    "community creator is the moderator",
    community.creator_member_id,
    moderator.id,
  );
  TestValidator.predicate(
    "community is not deleted initially",
    community.deleted_at === null || community.deleted_at === undefined,
  );
  TestValidator.equals(
    "initial subscriber count is zero",
    community.subscriber_count,
    0,
  );
  TestValidator.equals("initial post count is zero", community.post_count, 0);

  // Store original values for comparison after deletion
  const originalId = community.id;
  const originalName = community.name;
  const originalCreatedAt = community.created_at;
  const originalSubscriberCount = community.subscriber_count;
  const originalPostCount = community.post_count;

  // Step 3: Perform soft delete operation
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityid(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);

  // Step 4: Validate soft deletion results

  // Verify deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Verify deleted_at is a valid date-time format
  if (deletedCommunity.deleted_at) {
    TestValidator.predicate(
      "deleted_at is a valid date-time string",
      typeof deletedCommunity.deleted_at === "string" &&
        deletedCommunity.deleted_at.length > 0,
    );
  }

  // Verify immutable fields are preserved
  TestValidator.equals(
    "community ID is preserved after deletion",
    deletedCommunity.id,
    originalId,
  );
  TestValidator.equals(
    "community name is preserved after deletion",
    deletedCommunity.name,
    originalName,
  );
  TestValidator.equals(
    "created_at timestamp is preserved after deletion",
    deletedCommunity.created_at,
    originalCreatedAt,
  );

  // Verify final state metrics are preserved
  TestValidator.equals(
    "subscriber count is preserved in final state",
    deletedCommunity.subscriber_count,
    originalSubscriberCount,
  );
  TestValidator.equals(
    "post count is preserved in final state",
    deletedCommunity.post_count,
    originalPostCount,
  );

  // Verify all other community data is intact
  TestValidator.equals(
    "creator member ID is preserved",
    deletedCommunity.creator_member_id,
    moderator.id,
  );
  TestValidator.equals(
    "display title is preserved",
    deletedCommunity.display_title,
    communityDisplayTitle,
  );
  TestValidator.equals(
    "description is preserved",
    deletedCommunity.description,
    communityDescription,
  );
  TestValidator.equals(
    "rules are preserved",
    deletedCommunity.rules,
    communityRules,
  );
}
