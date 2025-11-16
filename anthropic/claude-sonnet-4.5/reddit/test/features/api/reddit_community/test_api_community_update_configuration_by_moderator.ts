import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the complete workflow of a moderator updating an existing community's
 * configuration and metadata.
 *
 * This test validates that authenticated moderators can successfully modify
 * community properties including display title, description, rules, icon URL,
 * and banner URL. It ensures proper authorization, data integrity, and
 * constraint validation during community updates.
 *
 * Test Workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Create a new community with initial configuration
 * 3. Update the community with modified properties
 * 4. Verify all modifications are correctly applied
 * 5. Validate immutable fields remain unchanged
 * 6. Confirm updated_at timestamp reflects the modification
 */
export async function test_api_community_update_configuration_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Create a new community with initial configuration
  const initialCommunityName = RandomGenerator.alphaNumeric(10);
  const initialDisplayTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const initialRules = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: initialCommunityName,
          display_title: initialDisplayTitle,
          description: initialDescription,
          rules: initialRules,
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Update the community with modified configuration
  const updatedDisplayTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 9,
  });
  const updatedRules = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 8,
  });
  const updatedIconUrl = typia.random<string & tags.Format<"uri">>();
  const updatedBannerUrl = typia.random<string & tags.Format<"uri">>();

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityname(
      connection,
      {
        communityName: createdCommunity.name,
        body: {
          display_title: updatedDisplayTitle,
          description: updatedDescription,
          rules: updatedRules,
          icon_url: updatedIconUrl,
          banner_url: updatedBannerUrl,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 4: Verify all modified fields are correctly updated
  TestValidator.equals(
    "display_title updated",
    updatedCommunity.display_title,
    updatedDisplayTitle,
  );
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals("rules updated", updatedCommunity.rules, updatedRules);
  TestValidator.equals(
    "icon_url updated",
    updatedCommunity.icon_url,
    updatedIconUrl,
  );
  TestValidator.equals(
    "banner_url updated",
    updatedCommunity.banner_url,
    updatedBannerUrl,
  );

  // Step 5: Validate immutable fields remain unchanged
  TestValidator.equals(
    "community id unchanged",
    updatedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "creator_member_id unchanged",
    updatedCommunity.creator_member_id,
    createdCommunity.creator_member_id,
  );
  TestValidator.equals(
    "subscriber_count preserved",
    updatedCommunity.subscriber_count,
    createdCommunity.subscriber_count,
  );
  TestValidator.equals(
    "post_count preserved",
    updatedCommunity.post_count,
    createdCommunity.post_count,
  );

  // Step 6: Verify updated_at timestamp reflects the modification
  const createdAtTime = new Date(createdCommunity.created_at).getTime();
  const updatedAtTime = new Date(updatedCommunity.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAtTime >= createdAtTime,
  );

  // Step 7: Validate display_title length constraint (max 100 characters)
  TestValidator.predicate(
    "display_title within max length",
    updatedCommunity.display_title.length <= 100,
  );

  // Step 8: Validate description length constraint (max 500 characters)
  TestValidator.predicate(
    "description within max length",
    updatedCommunity.description.length <= 500,
  );
}
