import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test updating a community rule's type classification to verify moderators can
 * change rule types (content, behavior, posting, moderation) and ensure proper
 * reclassification in moderation workflows and analytics tracking.
 *
 * This test validates the complete rule type update functionality:
 *
 * 1. Setup Phase: Register community moderator, create community context, create
 *    initial rule with "content" type
 * 2. Test Phase: Update rule type from "content" to "behavior", verify type change
 *    is persisted and applied
 * 3. Verification Phase: Confirm rule is properly reclassified and metadata
 *    reflects the change
 * 4. Edge Case Testing: Test updating to different rule types and validate system
 *    handles type transitions correctly
 *
 * The test ensures that when moderators change rule types, the system maintains
 * data integrity, updates analytics tracking, and applies the new
 * classification in moderation workflows without data loss or inconsistencies.
 */
export async function test_api_community_rule_update_change_type(
  connection: api.IConnection,
) {
  // Setup Phase: Create community moderator and community context
  const registeredUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const registeredUserPassword: string = typia.random<
    string & tags.MinLength<8>
  >();

  // Create a registered user first (needed for community creation)
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: registeredUserEmail,
        password: registeredUserPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Create a community using the registered user
  const communityName: string = `test_community_${typia.random<string & tags.MinLength<2> & tags.MaxLength<25>>()}`;
  const createdCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<100>
          >(),
          description: typia.random<string & tags.MaxLength<500>>(),
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Setup community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = typia.random<string & tags.MinLength<8>>();

  // Create community moderator
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([createdCommunity.id]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Test Phase: Create initial rule with "content" type
  const initialRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: communityName,
        body: {
          reddit_platform_community_id: createdCommunity.id,
          title: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<100>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<1000>
          >(),
          rule_type: "content",
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);

  // Verify initial rule type
  TestValidator.equals(
    "initial rule type should be content",
    initialRule.rule_type,
    "content",
  );

  // Test Phase: Update rule type from "content" to "behavior"
  const updatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: communityName,
        ruleId: initialRule.id,
        body: {
          rule_type: "behavior",
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Verification Phase: Confirm rule type change
  TestValidator.equals(
    "rule type should be updated to behavior",
    updatedRule.rule_type,
    "behavior",
  );
  TestValidator.equals(
    "rule ID should remain the same",
    updatedRule.id,
    initialRule.id,
  );
  TestValidator.equals(
    "community ID should remain the same",
    updatedRule.reddit_platform_community_id,
    initialRule.reddit_platform_community_id,
  );

  // Test different rule type transitions
  const finalRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: communityName,
        ruleId: updatedRule.id,
        body: {
          rule_type: "posting",
          title: "Updated Rule Title for Posting Type",
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(finalRule);

  // Verify final rule type change
  TestValidator.equals(
    "rule type should be updated to posting",
    finalRule.rule_type,
    "posting",
  );
  TestValidator.equals(
    "rule title should be updated",
    finalRule.title,
    "Updated Rule Title for Posting Type",
  );

  // Test updating to moderation type
  const moderationRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: communityName,
        ruleId: finalRule.id,
        body: {
          rule_type: "moderation",
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(moderationRule);

  // Verify moderation rule type
  TestValidator.equals(
    "rule type should be updated to moderation",
    moderationRule.rule_type,
    "moderation",
  );

  // Edge Case: Test updating back to content type
  const contentRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: communityName,
        ruleId: moderationRule.id,
        body: {
          rule_type: "content",
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(contentRule);

  // Verify content rule type restoration
  TestValidator.equals(
    "rule type should be restored to content",
    contentRule.rule_type,
    "content",
  );
  TestValidator.equals(
    "rule title should be preserved",
    contentRule.title,
    "Updated Rule Title for Posting Type",
  );

  // Final validation: Ensure rule maintains integrity across type changes
  TestValidator.equals(
    "rule ID should remain consistent throughout changes",
    contentRule.id,
    initialRule.id,
  );
  TestValidator.predicate("rule should be active", contentRule.is_active);
  TestValidator.predicate(
    "community association should be maintained",
    contentRule.reddit_platform_community_id === createdCommunity.id,
  );
}
