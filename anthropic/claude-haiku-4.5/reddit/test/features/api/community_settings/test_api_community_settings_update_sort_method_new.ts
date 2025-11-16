import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating community settings to configure feed display with newest posts
 * first.
 *
 * This test validates that a community creator can update the
 * default_sort_method to 'new' (reverse chronological), making the feed display
 * newest posts first. This is ideal for communities prioritizing timeliness
 * like news or real-time events.
 *
 * Test flow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a category for community classification
 * 3. Create member account (becomes community creator)
 * 4. Create a community
 * 5. Update community settings with default_sort_method = 'new'
 * 6. Validate HTTP 200 response with updated settings
 * 7. Verify sorting method change is reflected
 */
export async function test_api_community_settings_update_sort_method_new(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "News & Events",
          slug: `news_${RandomGenerator.alphaNumeric(4)}`,
          description: "Real-time news and event discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword,
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Breaking News Hub",
          identifier: `news_hub_${RandomGenerator.alphaNumeric(4)}`,
          description: "Latest breaking news and updates",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Update community settings with default_sort_method = 'new'
  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "new",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);

  // Step 6: Validate the response
  TestValidator.equals(
    "settings community id matches",
    updatedSettings.community_id,
    community.id,
  );

  // Step 7: Verify sorting method change is reflected
  TestValidator.equals(
    "default sort method updated to new",
    updatedSettings.default_sort_method,
    "new",
  );

  // Additional validation: Ensure settings record is valid
  TestValidator.predicate(
    "settings record has valid id",
    updatedSettings.id !== null && updatedSettings.id !== undefined,
  );

  TestValidator.predicate(
    "timestamps are present",
    updatedSettings.created_at !== null && updatedSettings.updated_at !== null,
  );
}
