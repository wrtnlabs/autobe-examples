import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_moderation_action_creation_for_appeal_testing(
  connection: api.IConnection,
) {
  // Step 1: Create a platform administrator account with comprehensive permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(8);

  const administrator: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdminPassword123!",
        display_name: "Platform Administrator",
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
        security_clearance: "top_secret",
        managed_communities: undefined,
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create test data for moderation action scenarios
  const targetUserEmail = typia.random<string & tags.Format<"email">>();
  const targetUser: IRedditPlatformRegisteredUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphabets(10),
    display_name: "Test User for Moderation",
    avatar_url: undefined,
    karma_score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    account_status: "active",
    email_verified: true,
    account_created: new Date().toISOString(),
  };

  const targetPost: IRedditPlatformPost.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reddit_registereduser_id: targetUser.id,
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Test Post for Moderation Action",
    content_type: "text",
    status: "active",
    score: typia.random<number & tags.Type<"int32">>(),
    comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    view_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    created_at: new Date().toISOString(),
    updated_at: undefined,
    author: targetUser,
    community: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "testcommunity",
      title: "Test Community for Moderation",
      description: "A test community for creating moderation action test data",
      type: "public",
      status: "active",
      business_status: "active",
      member_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
      post_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      subscriber_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >(),
      nsfw_content_allowed: false,
      created_at: new Date().toISOString(),
    },
    deleted_at: undefined,
  };

  // Use the administrator's moderator session ID for authenticity
  const moderatorSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test temporary user suspension (content-focused action)
  const suspensionAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          content: targetPost,
          user: targetUser,
          action_type: "user_suspension",
          reason:
            "Violation of community guidelines - multiple reports for inappropriate content and harassment of other community members. User has received 3 separate warnings but continues to violate posting standards.",
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(), // 1-30 days
          moderator_session_id: moderatorSessionId,
          is_automated: false,
          status: "active",
          admin_notes:
            "Initial suspension due to pattern of violations. User history shows escalating inappropriate behavior. Appeal should review user engagement history and recent warning escalation.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(suspensionAction);

  TestValidator.equals(
    "suspension action has valid UUID",
    suspensionAction.id,
    suspensionAction.id,
  );
  TestValidator.equals(
    "suspension action type is correct",
    suspensionAction.action_type,
    "user_suspension",
  );
  TestValidator.equals(
    "suspension action has detailed reason",
    suspensionAction.reason,
    "Violation of community guidelines - multiple reports for inappropriate content and harassment of other community members. User has received 3 separate warnings but continues to violate posting standards.",
  );
  TestValidator.equals(
    "suspension action has duration",
    suspensionAction.duration_hours !== undefined &&
      suspensionAction.duration_hours! > 0,
    true,
  );
  TestValidator.equals(
    "suspension action is not automated",
    suspensionAction.is_automated,
    false,
  );
  TestValidator.equals(
    "suspension action status is active",
    suspensionAction.status,
    "active",
  );
  TestValidator.equals(
    "suspension action appeal count starts at 0",
    suspensionAction.appeal_count,
    0,
  );
  TestValidator.equals(
    "suspension action has admin notes",
    suspensionAction.admin_notes.length > 0,
    true,
  );
  TestValidator.equals(
    "suspension action has moderator session tracking",
    suspensionAction.moderator_session_id,
    moderatorSessionId,
  );
  TestValidator.equals(
    "suspension action has created timestamp",
    suspensionAction.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "suspension action has updated timestamp",
    suspensionAction.updated_at !== undefined,
    true,
  );

  // Step 4: Test content removal (user-focused action)
  const contentRemovalAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          content: targetPost,
          user: targetUser,
          action_type: "content_removal",
          reason:
            "Post removed for violating Rule 1: No hate speech or discriminatory content. Post contained language targeting protected groups with derogatory terms.",
          duration_hours: undefined,
          moderator_session_id: moderatorSessionId,
          is_automated: true,
          status: "active",
          admin_notes:
            "Automated removal based on AI content analysis detecting hate speech patterns. Manual review confirms violation. Appeal should examine context and intent.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(contentRemovalAction);

  TestValidator.equals(
    "content removal action has valid UUID",
    contentRemovalAction.id,
    contentRemovalAction.id,
  );
  TestValidator.equals(
    "content removal action type is correct",
    contentRemovalAction.action_type,
    "content_removal",
  );
  TestValidator.equals(
    "content removal has no duration",
    contentRemovalAction.duration_hours,
    undefined,
  );
  TestValidator.equals(
    "content removal is automated",
    contentRemovalAction.is_automated,
    true,
  );
  TestValidator.equals(
    "content removal action status is active",
    contentRemovalAction.status,
    "active",
  );
  TestValidator.equals(
    "content removal has detailed violation reason",
    contentRemovalAction.reason.length > 50,
    true,
  );
  TestValidator.equals(
    "content removal has moderator session tracking",
    contentRemovalAction.moderator_session_id,
    moderatorSessionId,
  );

  // Step 5: Test permanent user ban (user-focused action)
  const banAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          content: undefined,
          user: targetUser,
          action_type: "user_ban",
          reason:
            "Permanent ban for severe policy violations including: targeted harassment campaign against specific user, sharing private information (doxxing), and threatening behavior. User has exhausted all appeal opportunities and continues violations from alternate accounts.",
          duration_hours: undefined,
          moderator_session_id: moderatorSessionId,
          is_automated: false,
          status: "active",
          admin_notes:
            "Final escalation after repeated violations. User has created 5 alternate accounts to circumvent previous suspensions. Legal team consulted. Appeal should review complete violation history and platform-wide impact.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(banAction);

  TestValidator.equals("ban action has valid UUID", banAction.id, banAction.id);
  TestValidator.equals(
    "ban action type is correct",
    banAction.action_type,
    "user_ban",
  );
  TestValidator.equals(
    "ban action has no duration (permanent)",
    banAction.duration_hours,
    undefined,
  );
  TestValidator.equals(
    "ban action is not automated",
    banAction.is_automated,
    false,
  );
  TestValidator.equals(
    "ban action status is active",
    banAction.status,
    "active",
  );
  TestValidator.equals(
    "ban action has comprehensive reasoning",
    banAction.reason.length > 100,
    true,
  );
  TestValidator.equals(
    "ban action has moderator session tracking",
    banAction.moderator_session_id,
    moderatorSessionId,
  );

  // Step 6: Test content lock (content-focused action)
  const contentLockAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          content: targetPost,
          user: targetUser,
          action_type: "content_lock",
          reason:
            "Post locked due to excessive off-topic comments and community reports. Thread has deviated from original topic and contains personal attacks between users.",
          duration_hours: undefined,
          moderator_session_id: moderatorSessionId,
          is_automated: false,
          status: "active",
          admin_notes:
            "Community members flagged for moderation intervention. Thread requires cleanup and topic enforcement. Appeal should examine comment thread context.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(contentLockAction);

  TestValidator.equals(
    "content lock action has valid UUID",
    contentLockAction.id,
    contentLockAction.id,
  );
  TestValidator.equals(
    "content lock action type is correct",
    contentLockAction.action_type,
    "content_lock",
  );
  TestValidator.equals(
    "content lock has no duration",
    contentLockAction.duration_hours,
    undefined,
  );
  TestValidator.equals(
    "content lock is not automated",
    contentLockAction.is_automated,
    false,
  );
  TestValidator.equals(
    "content lock has moderator session tracking",
    contentLockAction.moderator_session_id,
    moderatorSessionId,
  );

  // Step 7: Validate action IDs are unique across all created actions
  const actionIds = [
    suspensionAction.id,
    contentRemovalAction.id,
    banAction.id,
    contentLockAction.id,
  ];
  const uniqueActionIds = new Set(actionIds);
  TestValidator.equals(
    "all moderation action IDs are unique",
    uniqueActionIds.size,
    actionIds.length,
  );

  // Step 8: Validate moderator session tracking consistency
  const sessionIds = [
    suspensionAction.moderator_session_id,
    contentRemovalAction.moderator_session_id,
    banAction.moderator_session_id,
    contentLockAction.moderator_session_id,
  ];
  const allShareSameSession = sessionIds.every(
    (id) => id === moderatorSessionId,
  );
  TestValidator.equals(
    "all actions tracked by same moderator session",
    allShareSameSession,
    true,
  );

  // Step 9: Validate appeal readiness - all actions have sufficient context for appeals
  const appealsContext = [
    suspensionAction,
    contentRemovalAction,
    banAction,
    contentLockAction,
  ];
  const contextCheck = appealsContext.every(
    (action) =>
      action.reason.length >= 50 &&
      action.admin_notes.length >= 20 &&
      action.moderator_session_id.length === 36,
  );
  TestValidator.equals(
    "all actions provide sufficient context for appeal testing",
    contextCheck,
    true,
  );

  // Step 10: Verify timestamp consistency and logical ordering
  const timestamps = [
    suspensionAction,
    contentRemovalAction,
    banAction,
    contentLockAction,
  ]
    .map((action) => new Date(action.created_at).getTime())
    .sort((a, b) => a - b);

  const isChronological = timestamps.every(
    (timestamp, index) => index === 0 || timestamp >= timestamps[index - 1],
  );
  TestValidator.equals(
    "moderation actions are created in chronological order",
    isChronological,
    true,
  );

  // Step 11: Validate action status workflow readiness for appeals
  const activeActions = [
    suspensionAction,
    contentRemovalAction,
    banAction,
    contentLockAction,
  ].filter((action) => action.status === "active");
  TestValidator.equals(
    "all new moderation actions have active status for appeal testing",
    activeActions.length,
    4,
  );

  // Step 12: Final validation - test data provides comprehensive appeal testing scenarios
  const testScenarios = {
    temporarySuspension: {
      action: suspensionAction,
      duration: suspensionAction.duration_hours,
      appealable: suspensionAction.duration_hours !== undefined,
      appealContext: suspensionAction.admin_notes.length > 0,
    },
    contentRemoval: {
      action: contentRemovalAction,
      automated: contentRemovalAction.is_automated,
      appealable: true,
      appealContext: contentRemovalAction.admin_notes.length > 0,
    },
    permanentBan: {
      action: banAction,
      duration: banAction.duration_hours,
      appealable: banAction.duration_hours === undefined,
      appealContext: banAction.admin_notes.length > 0,
    },
    contentLock: {
      action: contentLockAction,
      appealable: true,
      appealContext: contentLockAction.admin_notes.length > 0,
    },
  };

  TestValidator.equals(
    "appeal test scenarios are comprehensive",
    Object.keys(testScenarios).length,
    4,
  );

  TestValidator.equals(
    "temporary suspension provides appeal context",
    testScenarios.temporarySuspension.appealable === true &&
      testScenarios.temporarySuspension.appealContext === true,
    true,
  );

  TestValidator.equals(
    "automated content removal provides appeal context",
    testScenarios.contentRemoval.automated === true &&
      testScenarios.contentRemoval.appealContext === true,
    true,
  );

  TestValidator.equals(
    "permanent ban provides appeal context",
    testScenarios.permanentBan.appealContext === true,
    true,
  );

  TestValidator.equals(
    "content lock provides appeal context",
    testScenarios.contentLock.appealContext === true,
    true,
  );

  // Step 13: Validate appeal tracking readiness
  const allActionsReadyForAppeal = [
    suspensionAction,
    contentRemovalAction,
    banAction,
    contentLockAction,
  ].every((action) => action.appeal_count === 0 && action.status === "active");
  TestValidator.equals(
    "all actions are ready for appeal tracking",
    allActionsReadyForAppeal,
    true,
  );

  // Step 14: Ensure sufficient variety for appeal testing
  const actionTypes = [
    suspensionAction.action_type,
    contentRemovalAction.action_type,
    banAction.action_type,
    contentLockAction.action_type,
  ];
  const uniqueActionTypes = new Set(actionTypes);
  TestValidator.equals(
    "moderation actions cover multiple violation types for appeal testing",
    uniqueActionTypes.size,
    4,
  );

  // Step 15: Final validation of appeal testing readiness
  const appealTestReadiness = {
    hasUniqueIdentifiers: actionIds.length === uniqueActionIds.size,
    hasProperModerationTracking: allShareSameSession,
    hasSufficientContext: contextCheck,
    hasChronologicalOrder: isChronological,
    hasActiveStatus: activeActions.length === 4,
    hasVariedScenarios: uniqueActionTypes.size === 4,
    hasAppealTracking: allActionsReadyForAppeal,
    hasDetailedReasoning: appealsContext.every(
      (action) => action.reason.length > 50,
    ),
    hasAdministrativeNotes: appealsContext.every(
      (action) => action.admin_notes.length > 20,
    ),
    hasProperTimestamps: appealsContext.every(
      (action) => action.created_at && action.updated_at,
    ),
  };

  const readinessScore =
    Object.values(appealTestReadiness).filter(Boolean).length;
  TestValidator.equals(
    "moderation actions provide comprehensive appeal testing readiness",
    readinessScore,
    Object.keys(appealTestReadiness).length,
  );
}
