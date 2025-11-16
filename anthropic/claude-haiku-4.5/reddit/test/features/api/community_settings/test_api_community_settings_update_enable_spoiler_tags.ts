import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_enable_spoiler_tags(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000",
  };
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminJoinData satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Switch to admin context
  const adminConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };

  // Step 2: Create a category for community
  const categoryData = {
    name: "Entertainment",
    slug: "entertainment",
    display_order: 1,
  };
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: categoryData satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const memberJoinData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  };
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberJoinData satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // Switch to member context
  const memberConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };

  // Step 4: Create a community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `media_${RandomGenerator.alphaNumeric(8)}`,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  };
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: communityData satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Enable spoiler tags in community settings
  const enableSpoilerSettings = {
    enable_spoiler_tags: true,
  };
  const enabledSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: enableSpoilerSettings satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(enabledSettings);
  TestValidator.equals(
    "spoiler tags should be enabled",
    enabledSettings.enable_spoiler_tags,
    true,
  );

  // Step 6: Verify the settings were applied correctly
  TestValidator.predicate(
    "community settings should have enable_spoiler_tags set to true",
    enabledSettings.enable_spoiler_tags === true,
  );

  // Step 7: Disable spoiler tags in community settings
  const disableSpoilerSettings = {
    enable_spoiler_tags: false,
  };
  const disabledSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: disableSpoilerSettings satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(disabledSettings);
  TestValidator.equals(
    "spoiler tags should be disabled",
    disabledSettings.enable_spoiler_tags,
    false,
  );

  // Step 8: Verify the disable was successful
  TestValidator.predicate(
    "community settings should have enable_spoiler_tags set to false",
    disabledSettings.enable_spoiler_tags === false,
  );

  // Validation: Verify that the feature toggle works correctly
  TestValidator.notEquals(
    "enabled and disabled settings should differ",
    enabledSettings.enable_spoiler_tags,
    disabledSettings.enable_spoiler_tags,
  );
}
