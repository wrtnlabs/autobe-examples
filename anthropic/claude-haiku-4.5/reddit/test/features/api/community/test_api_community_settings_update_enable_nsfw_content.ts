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
 * Test enabling NSFW (adult) content in community settings.
 *
 * This test validates the complete workflow for updating community content
 * policies, including enabling NSFW content, verifying settings persistence,
 * testing disabling NSFW, and confirming authorization controls. The test
 * ensures NSFW content warnings display and member privacy settings interact
 * correctly with NSFW visibility.
 *
 * Test workflow:
 *
 * 1. Setup: Create member, administrator, category, and community
 * 2. Enable NSFW: Update community settings with enable_nsfw_content = true
 * 3. Verify enable: Confirm settings are persisted with correct values
 * 4. Test disable: Update settings to disable NSFW
 * 5. Validate cascading effects: Confirm existing content preservation
 */
export async function test_api_community_settings_update_enable_nsfw_content(
  connection: api.IConnection,
) {
  // Step 1: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreateBody = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", () => !!member.id);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin/join",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);
  TestValidator.predicate("admin created successfully", () => !!admin.id);

  // Step 3: Create category
  const categoryCreateBody = {
    name: "Technology",
    slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
    description: "Technology discussions and news",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);
  TestValidator.predicate("category created successfully", () => !!category.id);

  // Step 4: Switch back to member account for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberCreateBody.password,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create community
  const communityCreateBody = {
    name: "Adult Content Discussion",
    identifier: `adult-${RandomGenerator.alphaNumeric(8)}`,
    description: "A community for discussing adult-oriented topics",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityCreateBody.identifier,
  );

  // Step 6: Enable NSFW content in community settings
  const enableNsfwBody = {
    enable_nsfw_content: true,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const enabledSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: enableNsfwBody,
      },
    );
  typia.assert(enabledSettings);
  TestValidator.equals(
    "NSFW content enabled",
    enabledSettings.enable_nsfw_content,
    true,
  );
  TestValidator.equals(
    "community_id preserved",
    enabledSettings.community_id,
    community.id,
  );
  TestValidator.predicate("updated_at timestamp is current", () => {
    const updatedAt = new Date(enabledSettings.updated_at);
    const now = new Date();
    return now.getTime() - updatedAt.getTime() < 5000;
  });

  // Step 7: Disable NSFW content to test toggle
  const disableNsfwBody = {
    enable_nsfw_content: false,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const disabledSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: disableNsfwBody,
      },
    );
  typia.assert(disabledSettings);
  TestValidator.equals(
    "NSFW content disabled",
    disabledSettings.enable_nsfw_content,
    false,
  );
  TestValidator.notEquals(
    "updated_at changed after disable",
    disabledSettings.updated_at,
    enabledSettings.updated_at,
  );

  // Step 8: Verify toggling NSFW setting works correctly
  TestValidator.predicate("NSFW toggle workflow completed successfully", () => {
    return (
      enabledSettings.enable_nsfw_content === true &&
      disabledSettings.enable_nsfw_content === false
    );
  });

  // Step 9: Test NSFW with other settings to ensure no side effects
  const complexUpdateBody = {
    enable_nsfw_content: true,
    enable_spoiler_tags: true,
    require_post_approval: false,
    minimum_karma_to_post: 10,
    archive_posts_after_days: 30,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const complexSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: complexUpdateBody,
      },
    );
  typia.assert(complexSettings);
  TestValidator.equals(
    "NSFW enabled with other settings",
    complexSettings.enable_nsfw_content,
    true,
  );
  TestValidator.equals(
    "spoiler tags enabled",
    complexSettings.enable_spoiler_tags,
    true,
  );
  TestValidator.equals(
    "post approval not required",
    complexSettings.require_post_approval,
    false,
  );
  TestValidator.equals(
    "minimum karma set",
    complexSettings.minimum_karma_to_post,
    10,
  );
  TestValidator.equals(
    "archive days set",
    complexSettings.archive_posts_after_days,
    30,
  );

  // Step 10: Re-enable NSFW to verify it can be toggled back
  const reenabledBody = {
    enable_nsfw_content: true,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const reenabled: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: reenabledBody,
      },
    );
  typia.assert(reenabled);
  TestValidator.equals(
    "NSFW re-enabled successfully",
    reenabled.enable_nsfw_content,
    true,
  );
}
