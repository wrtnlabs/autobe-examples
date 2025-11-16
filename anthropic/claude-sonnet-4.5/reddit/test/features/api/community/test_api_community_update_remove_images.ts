import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test the ability to remove community branding images by setting icon_url and
 * banner_url to null.
 *
 * This test validates that moderators can clear previously set visual elements,
 * returning the community to default platform styling. The workflow includes:
 *
 * 1. Create moderator account
 * 2. Create community with both icon_url and banner_url set to valid image URLs
 * 3. Update the community setting icon_url and banner_url to explicit null values
 * 4. Verify the response shows both image fields as null
 * 5. Confirm the community's visual identity has been reset to defaults
 */
export async function test_api_community_update_remove_images(
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

  // Step 2: Create community with both icon_url and banner_url set to valid image URLs
  const communityName = RandomGenerator.alphabets(10);
  const initialIconUrl = typia.random<string & tags.Format<"uri">>();
  const initialBannerUrl = typia.random<string & tags.Format<"uri">>();

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: initialIconUrl,
          banner_url: initialBannerUrl,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Verify initial community has both images set
  TestValidator.equals(
    "initial icon_url matches",
    createdCommunity.icon_url,
    initialIconUrl,
  );
  TestValidator.equals(
    "initial banner_url matches",
    createdCommunity.banner_url,
    initialBannerUrl,
  );

  // Step 3: Update the community setting icon_url and banner_url to explicit null values
  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.putByCommunityname(
      connection,
      {
        communityName: createdCommunity.name,
        body: {
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 4: Verify the response shows both image fields as null
  TestValidator.equals(
    "icon_url is null after update",
    updatedCommunity.icon_url,
    null,
  );
  TestValidator.equals(
    "banner_url is null after update",
    updatedCommunity.banner_url,
    null,
  );

  // Step 5: Confirm the community's visual identity has been reset to defaults
  TestValidator.predicate(
    "icon_url changed from initial value",
    updatedCommunity.icon_url !== initialIconUrl,
  );
  TestValidator.predicate(
    "banner_url changed from initial value",
    updatedCommunity.banner_url !== initialBannerUrl,
  );
  TestValidator.predicate(
    "community visual branding removed successfully",
    updatedCommunity.icon_url === null && updatedCommunity.banner_url === null,
  );
}
