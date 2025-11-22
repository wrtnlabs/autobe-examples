import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community moderator warning action creation process.
 *
 * This test validates the creation of user warning actions by authorized
 * community moderators. The test creates a community moderator account, then
 * performs a content warning action with detailed community guideline violation
 * documentation. This validates the graduated response mechanisms for handling
 * first-time or minor violations within the community context.
 *
 * Test workflow:
 *
 * 1. Create and authenticate community moderator account
 * 2. Create user warning moderation action with detailed documentation
 * 3. Validate action creation and response structure
 * 4. Verify moderation tracking and audit trail
 */
export async function test_api_community_moderator_content_warning_action(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for authentication
  const moderatorRegistrationData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: false,
      can_warn_users: true,
      can_pin_posts: false,
      can_edit_rules: false,
      can_manage_moderators: false,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: typia.random<string & tags.Format<"uuid">>(),
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://reddit-platform.test/registration",
    referrer: "https://reddit-platform.test/welcome",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const authenticatedModerator =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorRegistrationData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create user warning action with detailed community guideline violation documentation
  const warningActionData = {
    user: {
      id: typia.random<string & tags.Format<"uuid">>(),
      username: RandomGenerator.alphaNumeric(8),
      karma_score: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
      account_status: "active",
      email_verified: true,
      account_created: new Date().toISOString(),
    } satisfies IRedditPlatformRegisteredUser.ISummary,
    action_type: "user_warning",
    reason:
      "User violated community rule #3 regarding respectful discourse. The user posted inappropriate comments in the 'programming' community that contained personal attacks against other community members. This is a first-time violation that requires a formal warning as part of our graduated response system. The comments have been removed and the user has been notified of the specific policy violations.",
    status: "active",
    moderator_session_id: authenticatedModerator.moderator.id,
    admin_notes:
      "This warning action is part of the graduated response system for handling first-time minor violations. The user's previous record shows no previous moderation actions. The violation was reported by 3 community members and verified by moderator review. Recommended next steps include monitoring user activity for the next 7 days and providing educational resources about community guidelines.",
  } satisfies IRedditPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: warningActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Validate action creation and response structure
  TestValidator.equals(
    "moderation action type is warning",
    moderationAction.action_type,
    "user_warning",
  );
  TestValidator.equals(
    "action status is active",
    moderationAction.status,
    "active",
  );
  TestValidator.predicate(
    "moderation action has UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.id,
    ),
  );
  TestValidator.equals(
    "moderator session ID matches",
    moderationAction.moderator_session_id,
    authenticatedModerator.moderator.id,
  );
  TestValidator.predicate(
    "reason contains detailed violation documentation",
    moderationAction.reason.includes("community rule") &&
      moderationAction.reason.includes("first-time violation"),
  );

  // Step 4: Verify audit trail and tracking
  TestValidator.predicate(
    "action has valid timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      moderationAction.created_at,
    ),
  );
  TestValidator.equals(
    "appeal count initialized to zero",
    moderationAction.appeal_count,
    0,
  );
  TestValidator.predicate(
    "admin notes contain graduated response context",
    moderationAction.admin_notes !== null &&
      moderationAction.admin_notes.includes("graduated response"),
  );
}
