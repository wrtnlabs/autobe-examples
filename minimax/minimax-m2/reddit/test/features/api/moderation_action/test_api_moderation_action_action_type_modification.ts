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
 * Test community moderator escalating action type from warning to suspension
 * based on escalated violations.
 *
 * This E2E test validates the critical moderation workflow where community
 * moderators can escalate enforcement actions from warnings to suspensions when
 * violations escalate. The test follows a complete business workflow: creating
 * a moderator account, issuing an initial warning action, then modifying the
 * action type to a suspension with appropriate duration and justification.
 *
 * The scenario tests graduated response enforcement, action type modification
 * workflows, and proportional response adjustment logic essential for community
 * safety and moderation accountability. It ensures moderators can properly
 * escalate enforcement when circumstances change or additional evidence becomes
 * available.
 *
 * Test Flow:
 *
 * 1. Register community moderator account with authentication
 * 2. Create initial warning moderation action with violation details
 * 3. Modify action type from warning to suspension with escalation justification
 * 4. Validate successful action type change and updated metadata
 * 5. Verify audit trail and enforcement consistency
 */
export async function test_api_moderation_action_action_type_modification(
  connection: api.IConnection,
) {
  // Step 1: Register community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreatedAt = new Date().toISOString();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: moderatorCreatedAt,
        active_status: "active",
        appointed_at: moderatorCreatedAt,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: moderatorCreatedAt,
        updated_at: moderatorCreatedAt,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create initial warning moderation action
  const targetUser: IRedditPlatformRegisteredUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    karma_score: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    account_status: "active",
    email_verified: true,
    account_created: new Date().toISOString(),
  };

  const targetPost: IRedditPlatformPost.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reddit_registereduser_id: targetUser.id,
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    content_type: "text",
    status: "active",
    score: typia.random<number & tags.Type<"int32">>(),
    comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    view_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: targetUser,
    community: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(1),
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 6,
      }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      type: "public",
      status: "active",
      business_status: "active",
      member_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1>
      >(),
      post_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      subscriber_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
      nsfw_content_allowed: false,
      created_at: new Date().toISOString(),
    },
  };

  const warningAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          content: targetPost,
          user: targetUser,
          action_type: "user_warning",
          reason:
            "Minor rule violation - inappropriate language in post. First warning issued.",
          duration_hours: undefined,
          moderator_session_id: moderator.moderator.id,
          status: "active",
          admin_notes:
            "Initial warning for minor violation. User should receive guidance on community guidelines.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(warningAction);

  // Step 3: Escalate action from warning to suspension
  const escalatedAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.update(
      connection,
      {
        moderationActionId: warningAction.id,
        body: {
          content: targetPost,
          user: targetUser,
          action_type: "user_suspension",
          reason:
            "Escalated violation - user continued inappropriate behavior after warning. Additional reports received from community members.",
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<168>
          >(), // 1-7 days
          moderator_session_id: moderator.moderator.id,
          is_automated: false,
          status: "active",
          admin_notes:
            "Action escalated from warning to suspension due to continued violations and community reports. Suspension duration: 72 hours. User required to review community guidelines before reinstatement.",
        } satisfies IRedditPlatformModerationAction.IUpdate,
      },
    );
  typia.assert(escalatedAction);

  // Step 4: Validate successful action type escalation
  TestValidator.equals(
    "action type changed from warning to suspension",
    escalatedAction.action_type,
    "user_suspension",
  );

  TestValidator.equals(
    "escalation reason documented",
    escalatedAction.reason,
    "Escalated violation - user continued inappropriate behavior after warning. Additional reports received from community members.",
  );

  TestValidator.predicate(
    "suspension duration is properly set",
    escalatedAction.duration_hours !== null &&
      escalatedAction.duration_hours !== undefined &&
      escalatedAction.duration_hours >= 1 &&
      escalatedAction.duration_hours <= 168,
  );

  TestValidator.equals(
    "action status remains active",
    escalatedAction.status,
    "active",
  );

  TestValidator.predicate(
    "admin notes updated with escalation details",
    escalatedAction.admin_notes.includes("Action escalated from warning") &&
      escalatedAction.admin_notes.includes("suspension") &&
      escalatedAction.admin_notes.includes("72 hours"),
  );

  TestValidator.equals(
    "moderator session preserved",
    escalatedAction.moderator_session_id,
    moderator.moderator.id,
  );

  TestValidator.predicate(
    "escalation timestamp updated",
    new Date(escalatedAction.updated_at).getTime() >=
      new Date(warningAction.created_at).getTime(),
  );
}
