import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test creating a fully-configured community with all optional branding
 * elements.
 *
 * This test validates the complete community creation workflow where a
 * moderator establishes a new community with maximum visual customization
 * including both icon and banner URLs.
 *
 * Test flow:
 *
 * 1. Moderator joins/authenticates to obtain credentials
 * 2. Create a community with all required fields and optional branding
 * 3. Validate the created community has all properties correctly set
 * 4. Verify system-managed fields are properly initialized
 * 5. Confirm creator_member_id matches the authenticated moderator
 */
export async function test_api_community_creation_with_full_branding(
  connection: api.IConnection,
) {
  // Step 1: Moderator authentication - join to get credentials and token
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: "192.168.1.100",
        href: "https://reddit-community.example.com/join",
        referrer: "https://reddit-community.example.com/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community with full branding (all required + optional fields)
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const displayTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const description = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });
  const rules = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 7,
  });
  const iconUrl = "https://cdn.example.com/icons/community-icon.png";
  const bannerUrl = "https://cdn.example.com/banners/community-banner.jpg";

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: displayTitle,
          description: description,
          rules: rules,
          icon_url: iconUrl,
          banner_url: bannerUrl,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Validate required fields are correctly stored
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "display title matches",
    community.display_title,
    displayTitle,
  );
  TestValidator.equals(
    "description matches",
    community.description,
    description,
  );
  TestValidator.equals("rules match", community.rules, rules);

  // Step 4: Validate optional branding fields are correctly set
  TestValidator.equals("icon URL matches", community.icon_url, iconUrl);
  TestValidator.equals("banner URL matches", community.banner_url, bannerUrl);

  // Step 5: Verify system-managed fields are automatically initialized
  TestValidator.equals(
    "subscriber count initialized to 0",
    community.subscriber_count,
    0,
  );
  TestValidator.equals("post count initialized to 0", community.post_count, 0);

  // Step 6: Verify deleted_at is null or undefined (community is active)
  TestValidator.predicate(
    "community is active (not deleted)",
    community.deleted_at === null || community.deleted_at === undefined,
  );

  // Step 7: Confirm creator_member_id matches authenticated moderator
  TestValidator.equals(
    "creator matches authenticated moderator",
    community.creator_member_id,
    moderator.id,
  );
}
