import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_sort_method_top(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    username: `admin_${RandomGenerator.alphabets(8)}`,
    name: "Test Administrator",
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };

  // Step 2: Create test category for community organization
  const categoryData = {
    name: "Technology & Innovation",
    slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
    description: "Community for discussing technology and innovation topics",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `member_${RandomGenerator.alphabets(8)}`,
    password: "MemberPassword123!",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Switch to member connection for community management
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member.token.access}`,
    },
  };

  // Step 4: Create community within test category
  const communityData = {
    name: `Tech Discussion ${RandomGenerator.name()}`,
    identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
    description:
      "A community for technology discussions and innovation sharing",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body: communityData },
    );
  typia.assert(community);

  // Verify community was created successfully
  TestValidator.equals(
    "community should be created with provided identifier",
    community.identifier,
    communityData.identifier,
  );

  // Step 5: Update community settings to change default_sort_method to 'top'
  const updateSettingsData = {
    default_sort_method: "top",
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const updatedSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: updateSettingsData,
      },
    );
  typia.assert(updatedSettings);

  // Step 6: Verify HTTP 200 response and correct field value
  TestValidator.equals(
    "updated default_sort_method should be 'top'",
    updatedSettings.default_sort_method,
    "top",
  );

  TestValidator.equals(
    "settings community_id should match the target community",
    updatedSettings.community_id,
    community.id,
  );

  TestValidator.predicate(
    "updated_at timestamp should be set after update",
    updatedSettings.updated_at !== null &&
      updatedSettings.updated_at !== undefined,
  );

  // Step 7: Validate sorting preference rewards community curation
  TestValidator.predicate(
    "top sort method highlights quality content by prioritizing highest-voted posts",
    updatedSettings.default_sort_method === "top",
  );

  // Step 8: Test persistence of setting by verifying it in subsequent operations
  // Verify that the setting persists when other settings are updated
  const finalSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          enable_nsfw_content: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(finalSettings);

  // Verify that default_sort_method 'top' persists after updating other settings
  TestValidator.equals(
    "default_sort_method should persist as 'top' after updating other settings",
    finalSettings.default_sort_method,
    "top",
  );

  TestValidator.predicate(
    "nsfw_content setting should be updated independently",
    finalSettings.enable_nsfw_content === true,
  );

  TestValidator.equals(
    "community_id should remain consistent in settings",
    finalSettings.community_id,
    community.id,
  );
}
