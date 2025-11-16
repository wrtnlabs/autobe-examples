import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test partial update of community properties.
 *
 * This test validates that the community update API supports partial updates,
 * allowing modification of specific fields without affecting unspecified ones.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for authentication
 * 2. Create a community with full initial configuration (display_title,
 *    description, rules, icon_url, banner_url)
 * 3. Perform a partial update modifying only display_title and description
 * 4. Retrieve the updated community
 * 5. Verify that only the specified fields (display_title, description) were
 *    changed
 * 6. Verify that unspecified fields (rules, icon_url, banner_url) remain unchanged
 * 7. Verify that updated_at timestamp reflects the modification time
 */
export async function test_api_community_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community with full initial configuration
  const initialDisplayTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 8,
  });
  const initialRules = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const initialIconUrl = typia.random<string & tags.Format<"uri">>();
  const initialBannerUrl = typia.random<string & tags.Format<"uri">>();

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: initialDisplayTitle,
          description: initialDescription,
          rules: initialRules,
          icon_url: initialIconUrl,
          banner_url: initialBannerUrl,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Verify initial state
  TestValidator.equals(
    "initial display_title matches",
    community.display_title,
    initialDisplayTitle,
  );
  TestValidator.equals(
    "initial description matches",
    community.description,
    initialDescription,
  );
  TestValidator.equals("initial rules match", community.rules, initialRules);
  TestValidator.equals(
    "initial icon_url matches",
    community.icon_url,
    initialIconUrl,
  );
  TestValidator.equals(
    "initial banner_url matches",
    community.banner_url,
    initialBannerUrl,
  );

  // Step 3: Perform partial update - only modify display_title and description
  const updatedDisplayTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 9,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 7,
  });

  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityid(
      connection,
      {
        communityId: community.id,
        body: {
          display_title: updatedDisplayTitle,
          description: updatedDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 4: Verify partial update results
  // Verify updated fields
  TestValidator.equals(
    "updated display_title matches new value",
    updatedCommunity.display_title,
    updatedDisplayTitle,
  );
  TestValidator.equals(
    "updated description matches new value",
    updatedCommunity.description,
    updatedDescription,
  );

  // Verify unchanged fields retained original values
  TestValidator.equals(
    "rules unchanged after partial update",
    updatedCommunity.rules,
    initialRules,
  );
  TestValidator.equals(
    "icon_url unchanged after partial update",
    updatedCommunity.icon_url,
    initialIconUrl,
  );
  TestValidator.equals(
    "banner_url unchanged after partial update",
    updatedCommunity.banner_url,
    initialBannerUrl,
  );

  // Verify updated_at timestamp was modified
  TestValidator.predicate(
    "updated_at timestamp is after created_at",
    new Date(updatedCommunity.updated_at).getTime() >
      new Date(community.created_at).getTime(),
  );

  // Verify community ID remains the same
  TestValidator.equals(
    "community ID unchanged",
    updatedCommunity.id,
    community.id,
  );
}
