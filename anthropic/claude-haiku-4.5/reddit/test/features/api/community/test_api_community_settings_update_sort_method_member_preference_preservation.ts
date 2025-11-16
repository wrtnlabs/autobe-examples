import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_sort_method_member_preference_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member for testing preference preservation
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(12);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: member1Password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 4: Create community with initial default_sort_method "hot"
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created with default sort method hot",
    true,
  );

  // Step 5: Create second member to test multi-user preference scenarios
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(12);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: member2Password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Switch to administrator to update community settings
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 7: Update default_sort_method from "hot" to "new" - simulating setting change
  const updatedSettingsToNew: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "new",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettingsToNew);
  TestValidator.equals(
    "default sort method updated to new",
    updatedSettingsToNew.default_sort_method,
    "new",
  );

  // Step 8: Update default_sort_method from "new" to "top"
  const updatedSettingsToTop: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "top",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettingsToTop);
  TestValidator.equals(
    "default sort method updated to top",
    updatedSettingsToTop.default_sort_method,
    "top",
  );

  // Step 9: Update default_sort_method from "top" to "controversial"
  const updatedSettingsToControversial: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "controversial",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettingsToControversial);
  TestValidator.equals(
    "default sort method updated to controversial",
    updatedSettingsToControversial.default_sort_method,
    "controversial",
  );

  // Step 10: Verify that settings were properly updated through transitions
  TestValidator.predicate(
    "all sort method transitions completed successfully",
    updatedSettingsToControversial.default_sort_method === "controversial",
  );

  // Step 11: Test reverse transition back to "new" to validate setting flexibility
  const revertedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "new",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(revertedSettings);
  TestValidator.equals(
    "default sort method can be changed back to new",
    revertedSettings.default_sort_method,
    "new",
  );

  // Step 12: Verify settings object contains all expected fields
  TestValidator.predicate(
    "updated settings contain valid community_id",
    revertedSettings.community_id === community.id,
  );

  // Step 13: Confirm that multiple transitions preserve setting integrity
  const finalSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
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
    "final sort method returned to hot after multiple transitions",
    finalSettings.default_sort_method,
    "hot",
  );
}
