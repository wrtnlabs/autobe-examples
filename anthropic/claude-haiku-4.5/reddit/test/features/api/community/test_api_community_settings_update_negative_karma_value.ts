import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_negative_karma_value(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      href: "https://localhost/test",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "https://localhost/admin",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create a category for the community (as admin)
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: "Test category for validation",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Re-authenticate as member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123!",
      href: "https://localhost/test",
      referrer: "https://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create a community as the authenticated member
  const communityData = {
    name: "Test Community",
    identifier: RandomGenerator.alphabets(10),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 6: Test updating community settings with negative karma value should fail
  await TestValidator.error(
    "negative karma value should be rejected with validation error",
    async () => {
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: community.id,
          body: {
            minimum_karma_to_post: -5,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    },
  );

  // Step 7: Verify that zero karma value is accepted (no restriction)
  const settingsWithZero =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 0,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(settingsWithZero);
  TestValidator.equals(
    "zero karma should be accepted as no restriction",
    settingsWithZero.minimum_karma_to_post,
    0,
  );

  // Step 8: Verify that positive karma value is accepted (establishes requirement)
  const settingsWithPositive =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 50,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(settingsWithPositive);
  TestValidator.equals(
    "positive karma should be accepted to establish requirement",
    settingsWithPositive.minimum_karma_to_post,
    50,
  );
}
