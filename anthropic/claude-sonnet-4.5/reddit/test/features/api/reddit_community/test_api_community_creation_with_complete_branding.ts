import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community creation with complete branding fields.
 *
 * This test validates the maximum customization path for community creation,
 * where a moderator creates a fully branded community with both icon_url and
 * banner_url optional fields included alongside all required fields.
 *
 * Test workflow:
 *
 * 1. Moderator authenticates via join endpoint to obtain JWT tokens
 * 2. Moderator creates a community with complete branding (icon_url and
 *    banner_url)
 * 3. Validate that the created community has all required fields properly set
 * 4. Validate that icon_url is stored correctly and matches the input
 * 5. Validate that banner_url is stored correctly and matches the input
 * 6. Verify that both URLs are valid URI format
 * 7. Confirm the community response contains complete visual branding data
 */
export async function test_api_community_creation_with_complete_branding(
  connection: api.IConnection,
) {
  // Step 1: Moderator registration and authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: connectionHref,
        referrer: connectionReferrer,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify moderator authentication succeeded
  TestValidator.predicate(
    "moderator email matches",
    moderator.email === moderatorEmail,
  );
  TestValidator.predicate(
    "moderator has valid token",
    moderator.token.access.length > 0,
  );

  // Step 2: Create community with complete branding (icon_url and banner_url)
  const communityName = RandomGenerator.alphabets(10);
  const displayTitle = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.paragraph({ sentences: 10 });
  const rules = RandomGenerator.paragraph({ sentences: 8 });
  const iconUrl = typia.random<string & tags.Format<"uri">>();
  const bannerUrl = typia.random<string & tags.Format<"uri">>();

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

  // Step 3: Validate required fields
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community display title matches",
    community.display_title,
    displayTitle,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    description,
  );
  TestValidator.equals("community rules match", community.rules, rules);

  // Step 4: Validate icon_url is stored correctly
  TestValidator.predicate(
    "icon_url is defined",
    community.icon_url !== null && community.icon_url !== undefined,
  );
  if (community.icon_url) {
    TestValidator.equals("icon_url matches input", community.icon_url, iconUrl);
  }

  // Step 5: Validate banner_url is stored correctly
  TestValidator.predicate(
    "banner_url is defined",
    community.banner_url !== null && community.banner_url !== undefined,
  );
  if (community.banner_url) {
    TestValidator.equals(
      "banner_url matches input",
      community.banner_url,
      bannerUrl,
    );
  }

  // Step 6: Verify community creator is the authenticated moderator
  TestValidator.equals(
    "creator_member_id matches moderator id",
    community.creator_member_id,
    moderator.id,
  );

  // Step 7: Verify initial counters are zero
  TestValidator.equals(
    "subscriber_count is zero",
    community.subscriber_count,
    0,
  );
  TestValidator.equals("post_count is zero", community.post_count, 0);

  // Step 8: Verify community has valid UUID
  TestValidator.predicate("community has valid id", community.id.length > 0);

  // Step 9: Verify timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    community.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    community.updated_at.length > 0,
  );

  // Step 10: Verify deleted_at is null for active community
  TestValidator.predicate(
    "community is not deleted",
    community.deleted_at === null || community.deleted_at === undefined,
  );
}
