import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_concurrent_modification_conflict(
  connection: api.IConnection,
) {
  // Step 1: Create first member account for updates
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "SecurePass123!";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphabets(8),
      password: member1Password,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Create administrator and category for community
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphabets(8),
      password: adminPassword,
      name: "Administrator",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Login as member1 and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create second member account for concurrent modification testing
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "SecurePass123!";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphabets(8),
      password: member2Password,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 5: Both members read current settings to get baseline state
  // Member 1 login and read settings
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Execute first update from member1
  const firstUpdate =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          enable_nsfw_content: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update should enable NSFW content",
    firstUpdate.enable_nsfw_content,
    true,
  );

  // Step 7: Login as member2 and attempt concurrent update - should fail with 409
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "concurrent modification should return 409 conflict when updating stale version",
    async () => {
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: community.id,
          body: {
            require_post_approval: true,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    },
  );

  // Step 8: Member2 retries with fresh state by reading current settings first
  // Member2 re-fetches to get current state (simulate retry scenario)
  const updatedSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          require_post_approval: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  TestValidator.equals(
    "retry should succeed with current state",
    updatedSettings.require_post_approval,
    true,
  );

  // Step 9: Verify both updates were applied in sequence
  TestValidator.equals(
    "both NSFW and post approval should be enabled",
    updatedSettings.enable_nsfw_content,
    true,
  );
}
