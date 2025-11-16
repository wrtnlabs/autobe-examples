import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_minimum_karma_barrier(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = RandomGenerator.alphabets(8) + "@admin.test";
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);

  // Switch to admin context
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${adminAccount.token.access}`,
    },
  };

  // Step 2: Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(6),
          display_order: 1,
          description: "Technology and programming discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const memberEmail = RandomGenerator.alphabets(8) + "@member.test";
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      username: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Switch to member context
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${memberAccount.token.access}`,
    },
  };

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "Programming Discussions",
          identifier: "prog-" + RandomGenerator.alphaNumeric(6),
          description: "A community for programming topics",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Update community settings with minimum_karma_to_post = 50
  const updatedSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 50,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  TestValidator.equals(
    "minimum_karma_to_post should be set to 50",
    updatedSettings.minimum_karma_to_post,
    50,
  );

  // Step 6: Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at should be a valid date",
    () => !isNaN(Date.parse(updatedSettings.updated_at)),
  );

  // Step 7: Test edge case - set to zero to remove restriction
  const zeroKarmaSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 0,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(zeroKarmaSettings);
  TestValidator.equals(
    "minimum_karma_to_post should be set to 0 (no restriction)",
    zeroKarmaSettings.minimum_karma_to_post,
    0,
  );

  // Step 8: Verify settings can be updated with multiple settings at once
  const multipleSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 25,
          minimum_account_age_days: 7,
          require_post_approval: false,
          enable_nsfw_content: false,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(multipleSettings);
  TestValidator.equals(
    "minimum_karma_to_post should be 25",
    multipleSettings.minimum_karma_to_post,
    25,
  );
  TestValidator.equals(
    "minimum_account_age_days should be 7",
    multipleSettings.minimum_account_age_days,
    7,
  );
  TestValidator.equals(
    "require_post_approval should be false",
    multipleSettings.require_post_approval,
    false,
  );
}
