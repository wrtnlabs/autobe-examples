import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test retrieval of a community that has custom icon_url and banner_url
 * configured.
 *
 * This test validates that communities with complete visual branding (icon and
 * banner) are properly created, stored, and retrieved through the public API.
 * It ensures that the GET endpoint returns valid URI-formatted URLs for both
 * branding elements.
 *
 * Test Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create a community with both icon_url and banner_url
 * 3. Retrieve the community using its unique name
 * 4. Validate that both branding URLs are present and match creation values
 * 5. Verify URI format compliance for icon_url and banner_url
 * 6. Confirm all community data integrity
 */
export async function test_api_community_retrieval_with_branding_elements(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community with icon_url and banner_url
  const iconUrl = typia.random<string & tags.Format<"uri">>();
  const bannerUrl = typia.random<string & tags.Format<"uri">>();
  const communityName = RandomGenerator.alphabets(10);

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: iconUrl,
          banner_url: bannerUrl,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Retrieve the community by its unique name
  const retrievedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: communityName,
    });
  typia.assert(retrievedCommunity);

  // Step 4: Validate branding URLs are present and match creation values
  TestValidator.equals(
    "retrieved community ID matches created community",
    retrievedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "retrieved community name matches",
    retrievedCommunity.name,
    communityName,
  );

  TestValidator.equals(
    "icon_url matches the created value",
    retrievedCommunity.icon_url,
    iconUrl,
  );

  TestValidator.equals(
    "banner_url matches the created value",
    retrievedCommunity.banner_url,
    bannerUrl,
  );

  // Step 5: Verify URI format compliance (typia.assert already validates format tags)
  TestValidator.predicate(
    "icon_url is not null or undefined",
    retrievedCommunity.icon_url !== null &&
      retrievedCommunity.icon_url !== undefined,
  );

  TestValidator.predicate(
    "banner_url is not null or undefined",
    retrievedCommunity.banner_url !== null &&
      retrievedCommunity.banner_url !== undefined,
  );

  // Step 6: Validate other community properties
  TestValidator.equals(
    "display_title matches",
    retrievedCommunity.display_title,
    createdCommunity.display_title,
  );

  TestValidator.equals(
    "description matches",
    retrievedCommunity.description,
    createdCommunity.description,
  );

  TestValidator.equals(
    "rules match",
    retrievedCommunity.rules,
    createdCommunity.rules,
  );
}
