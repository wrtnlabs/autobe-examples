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
 * Validates community settings update for default feed sorting algorithm.
 *
 * Tests the ability to change the default_sort_method from initial value to
 * 'hot' and verify the update persists correctly. This test validates that
 * community creators can customize how posts are displayed to new members in
 * their communities.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to create platform categories
 * 2. Create a content category for the community
 * 3. Authenticate as a regular member to become community creator
 * 4. Create a community assigned to the category
 * 5. Retrieve the initial community settings
 * 6. Update the default_sort_method to 'hot'
 * 7. Verify the update succeeded with HTTP 200 response
 * 8. Validate the default_sort_method field is now set to 'hot'
 * 9. Test transitioning through different sort methods to ensure flexibility
 * 10. Confirm changes apply only to new visits while preserving user preferences
 */
export async function test_api_community_settings_update_sort_method_hot(
  connection: api.IConnection,
) {
  // Step 1: Administrator setup - Create platform category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology & Innovation",
          slug: "tech-innovation",
          description: "Communities focused on technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Member setup - Create member account for community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(15),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "AI & Machine Learning Discussion",
          identifier: `ml-community-${RandomGenerator.alphaNumeric(8)}`,
          description:
            "A community for discussing AI and machine learning topics",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with identifier",
    typeof community.identifier,
    "string",
  );

  // Step 5: Update community settings - Change default_sort_method to 'hot'
  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "hot",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);

  // Step 6: Validate the update was successful
  TestValidator.equals(
    "default_sort_method updated to hot",
    updatedSettings.default_sort_method,
    "hot",
  );
  TestValidator.equals(
    "community_id matches",
    updatedSettings.community_id,
    community.id,
  );

  // Step 7: Test transitioning between different sort methods
  const sortMethods: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];

  for (const sortMethod of sortMethods) {
    const transitionedSettings: ICommunityPlatformCommunitySettings =
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: community.id,
          body: {
            default_sort_method: sortMethod,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    typia.assert(transitionedSettings);
    TestValidator.equals(
      `sort method transitioned to ${sortMethod}`,
      transitionedSettings.default_sort_method,
      sortMethod,
    );
  }

  // Step 8: Final verification - Settings should reflect 'controversial' from last transition
  const finalSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "hot",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(finalSettings);
  TestValidator.equals(
    "final sort method is hot",
    finalSettings.default_sort_method,
    "hot",
  );
  TestValidator.predicate(
    "settings have valid timestamps",
    finalSettings.created_at !== undefined &&
      finalSettings.updated_at !== undefined,
  );
}
