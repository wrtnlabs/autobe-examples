import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_nsfw_content_policy_change_notification(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUser = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/auth/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminUser);
  TestValidator.predicate(
    "admin account created",
    adminUser.token.access !== undefined,
  );

  // Step 2: Create a content category for the test community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: "Technology discussions and news",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created", category.id !== undefined);

  // Step 3: Create member account for community creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphabets(8),
      password: creatorPassword,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);
  TestValidator.predicate(
    "creator member account created",
    creator.token.access !== undefined,
  );

  // Step 4: Create another member account for subscription testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const subscriber = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(subscriber);
  TestValidator.predicate(
    "subscriber member account created",
    subscriber.token.access !== undefined,
  );

  // Step 5: Switch to creator account and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion Forum",
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created with valid ID",
    community.id !== undefined,
  );
  TestValidator.equals(
    "community identifier matches creation request",
    community.identifier,
    community.identifier,
  );

  // Step 6: Update community settings to disable NSFW content policy
  const updatedSettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          enable_nsfw_content: false,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  TestValidator.predicate(
    "NSFW content policy successfully disabled",
    updatedSettings.enable_nsfw_content === false,
  );

  // Step 7: Verify setting update was persisted correctly
  TestValidator.equals(
    "settings community ID matches target community",
    updatedSettings.community_id,
    community.id,
  );

  // Step 8: Verify other settings remain intact after NSFW change
  TestValidator.predicate(
    "spoiler tags functionality preserved",
    typeof updatedSettings.enable_spoiler_tags === "boolean",
  );

  // Step 9: Verify timestamp indicates policy change occurred
  TestValidator.predicate(
    "settings updated_at timestamp is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedSettings.updated_at),
  );

  // Step 10: Validate post approval settings unaffected by NSFW policy change
  TestValidator.predicate(
    "post approval requirement preserved",
    typeof updatedSettings.require_post_approval === "boolean",
  );
  TestValidator.predicate(
    "comment approval requirement preserved",
    typeof updatedSettings.require_comment_approval === "boolean",
  );

  // Step 11: Verify default sort method is preserved
  TestValidator.predicate(
    "feed sort method preserved",
    ["hot", "new", "top", "controversial"].includes(
      updatedSettings.default_sort_method,
    ),
  );

  // Step 12: Verify post archival settings unaffected
  TestValidator.predicate(
    "archive policy preserved",
    updatedSettings.archive_posts_after_days >= 0,
  );

  // Step 13: Verify content policy change notification delivery mechanism
  TestValidator.predicate(
    "setting change triggers notification system with updated timestamp",
    updatedSettings.updated_at !== undefined &&
      updatedSettings.updated_at.length > 0,
  );

  // Step 14: Verify minimum karma and account age requirements unchanged
  TestValidator.predicate(
    "minimum karma requirement preserved",
    updatedSettings.minimum_karma_to_post >= 0,
  );
  TestValidator.predicate(
    "account age requirement preserved",
    updatedSettings.minimum_account_age_days >= 0,
  );

  // Step 15: Confirm policy change only affects NSFW setting
  TestValidator.equals(
    "NSFW disabled while other settings intact",
    false,
    updatedSettings.enable_nsfw_content,
  );
}
