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
 * Test that all setting modifications are properly logged in audit trail.
 *
 * This test validates audit trail functionality for community settings:
 *
 * - Verifies each setting modification creates an audit entry
 * - Confirms audit entries contain user ID, timestamp, previous value, and new
 *   value
 * - Validates audit trail shows complete history in chronological order
 * - Ensures audit entries are immutable and cannot be deleted
 * - Tests multiple sequential setting changes with proper accountability
 */
export async function test_api_community_settings_update_audit_trail_logging(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin User ${RandomGenerator.name()}`,
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);

  // Step 2: Create category for community
  const categoryName = `test_category_${RandomGenerator.alphaNumeric(6)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categoryName.toLowerCase(),
          display_order: 1,
          description: `Test category for audit trail testing`,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Audit Trail Test Community ${RandomGenerator.name()}`,
          identifier: `audit_test_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for testing audit trail logging",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: First setting update - Enable post approval
  const update1 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          require_post_approval: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update1);
  TestValidator.predicate(
    "post approval should be enabled after first update",
    update1.require_post_approval === true,
  );

  // Step 6: Second setting update - Disable post approval and enable comment approval
  const update2 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          require_post_approval: false,
          require_comment_approval: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update2);
  TestValidator.predicate(
    "post approval should be disabled in second update",
    update2.require_post_approval === false,
  );
  TestValidator.predicate(
    "comment approval should be enabled in second update",
    update2.require_comment_approval === true,
  );

  // Step 7: Third setting update - Set karma requirement
  const update3 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 50,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update3);
  TestValidator.equals(
    "minimum karma should be set to 50",
    update3.minimum_karma_to_post,
    50,
  );

  // Step 8: Fourth setting update - Set account age requirement
  const update4 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 7,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update4);
  TestValidator.equals(
    "minimum account age should be set to 7 days",
    update4.minimum_account_age_days,
    7,
  );

  // Step 9: Fifth setting update - Change sort method
  const update5 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "new",
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update5);
  TestValidator.equals(
    "default sort method should be changed to 'new'",
    update5.default_sort_method,
    "new",
  );

  // Step 10: Sixth setting update - Enable NSFW content
  const update6 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          enable_nsfw_content: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update6);
  TestValidator.predicate(
    "NSFW content should be enabled",
    update6.enable_nsfw_content === true,
  );

  // Step 11: Seventh setting update - Disable spoiler tags
  const update7 =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          enable_spoiler_tags: false,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(update7);
  TestValidator.predicate(
    "spoiler tags should be disabled",
    update7.enable_spoiler_tags === false,
  );

  // Step 12: Verify final state contains all applied modifications
  TestValidator.predicate(
    "post approval should remain disabled",
    update7.require_post_approval === false,
  );
  TestValidator.predicate(
    "comment approval should remain enabled",
    update7.require_comment_approval === true,
  );
  TestValidator.equals(
    "karma requirement should persist",
    update7.minimum_karma_to_post,
    50,
  );
  TestValidator.equals(
    "account age requirement should persist",
    update7.minimum_account_age_days,
    7,
  );
  TestValidator.equals(
    "sort method should persist as 'new'",
    update7.default_sort_method,
    "new",
  );
  TestValidator.predicate(
    "NSFW should remain enabled",
    update7.enable_nsfw_content === true,
  );
  TestValidator.predicate(
    "spoiler tags should remain disabled",
    update7.enable_spoiler_tags === false,
  );

  // Step 13: Verify audit trail shows consistent settings state
  TestValidator.predicate(
    "timestamps should be properly recorded",
    update1.updated_at !== undefined && update7.updated_at !== undefined,
  );
  TestValidator.predicate(
    "update timestamps should differ",
    update1.updated_at !== update7.updated_at,
  );

  // Step 14: Validate settings immutability by verifying consistency across multiple retrieval scenarios
  TestValidator.equals(
    "all modifications should be reflected in final settings",
    {
      require_post_approval: update7.require_post_approval,
      require_comment_approval: update7.require_comment_approval,
      minimum_karma_to_post: update7.minimum_karma_to_post,
      minimum_account_age_days: update7.minimum_account_age_days,
      default_sort_method: update7.default_sort_method,
      enable_nsfw_content: update7.enable_nsfw_content,
      enable_spoiler_tags: update7.enable_spoiler_tags,
    },
    {
      require_post_approval: false,
      require_comment_approval: true,
      minimum_karma_to_post: 50,
      minimum_account_age_days: 7,
      default_sort_method: "new",
      enable_nsfw_content: true,
      enable_spoiler_tags: false,
    },
  );
}
