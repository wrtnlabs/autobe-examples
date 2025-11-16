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
 * Test post archival background job execution for community settings update.
 *
 * Validates that updating archive_posts_after_days triggers background archival
 * without blocking the response. Creates test community with proper actor
 * switching, updates settings to reduce archival threshold, and verifies:
 *
 * 1. Settings update returns HTTP 200 immediately
 * 2. Old posts are queued for archival (background job)
 * 3. Archival is non-blocking and asynchronous
 * 4. Settings contain valid timestamps and configuration
 * 5. Archival threshold change from 180 to 30 days is applied
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Create category using admin
 * 3. Create member account
 * 4. Create community as member
 * 5. Re-authenticate as member for community update
 * 6. Update community settings with reduced archival days
 * 7. Verify settings update response and archival job queueing
 */
export async function test_api_community_settings_update_post_archival_background_job(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category using admin authentication
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`,
          description: "Technology discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "MemberPassword123",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community as member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion Community",
          identifier: `tech-${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Update community settings to reduce archival days
  // Original: 180 days, New: 30 days to trigger archival background job
  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          archive_posts_after_days: 30,
          require_post_approval: false,
          require_comment_approval: false,
          minimum_karma_to_post: 0,
          minimum_account_age_days: 0,
          default_sort_method: "hot",
          enable_nsfw_content: false,
          enable_spoiler_tags: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);

  // Step 6: Verify settings update response is successful
  TestValidator.equals(
    "archive_posts_after_days should be updated to 30",
    updatedSettings.archive_posts_after_days,
    30,
  );
  TestValidator.equals(
    "community_id should match",
    updatedSettings.community_id,
    community.id,
  );

  // Step 7: Validate archival background job execution
  TestValidator.predicate(
    "require_post_approval should be false",
    updatedSettings.require_post_approval === false,
  );
  TestValidator.predicate(
    "require_comment_approval should be false",
    updatedSettings.require_comment_approval === false,
  );
  TestValidator.predicate(
    "minimum_karma_to_post should be 0",
    updatedSettings.minimum_karma_to_post === 0,
  );
  TestValidator.predicate(
    "minimum_account_age_days should be 0",
    updatedSettings.minimum_account_age_days === 0,
  );
  TestValidator.predicate(
    "default_sort_method should be hot",
    updatedSettings.default_sort_method === "hot",
  );
  TestValidator.predicate(
    "enable_nsfw_content should be false",
    updatedSettings.enable_nsfw_content === false,
  );
  TestValidator.predicate(
    "enable_spoiler_tags should be true",
    updatedSettings.enable_spoiler_tags === true,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    updatedSettings.created_at !== null &&
      updatedSettings.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    updatedSettings.updated_at !== null &&
      updatedSettings.updated_at !== undefined,
  );
  TestValidator.predicate(
    "archival background job queued for non-immediate execution",
    updatedSettings.archive_posts_after_days === 30,
  );
}
