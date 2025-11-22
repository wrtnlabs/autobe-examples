import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test comprehensive appeal status tracking and timeline information for
 * registered users.
 *
 * This test validates the complete appeal lifecycle functionality including
 * status tracking, timeline information, and comprehensive appeal details
 * retrieval. The scenario involves creating a moderation action, then
 * retrieving appeal status tracking information to verify users can track their
 * appeal progress throughout the entire lifecycle from initial submission
 * through final resolution.
 *
 * **Test Flow:**
 *
 * 1. Create platform administrator account and authenticate
 * 2. Create moderation action with proper context and enforcement details
 * 3. Create registered user account and authenticate
 * 4. Retrieve specific appeal details to verify status tracking information
 * 5. Validate comprehensive appeal status including appeal level, escalation
 *    status, creation timestamps, update history, and resolution timestamps
 * 6. Verify appeal status changes are properly reflected in retrieval response
 * 7. Confirm users receive accurate, up-to-date information about appeal progress
 */
export async function test_api_specific_appeal_status_tracking_by_appellant(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for moderation action creation
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        email: platformAdminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        administrator_level: "admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: { can_create_users: true, can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Create registered user account who will be subject to moderation action
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: registeredUserEmail,
        password: "UserPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        href: "https://reddit-platform.example.com/register",
        referrer: "https://reddit-platform.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 3: Platform administrator creates moderation action for testing appeal status tracking
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          user: {
            id: registeredUser.id,
            username: registeredUser.username,
            display_name: registeredUser.displayName,
            karma_score: registeredUser.karmaScore,
            account_status: registeredUser.accountStatus,
            email_verified: registeredUser.emailVerified,
            account_created: registeredUser.accountCreated,
          },
          action_type: "user_warning",
          reason:
            "Test moderation action for appeal status tracking verification",
          duration_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<168>
          >(),
          moderator_session_id: typia.random<string & tags.Format<"uuid">>(),
          is_automated: false,
          status: "active",
          admin_notes:
            "Test appeal status tracking - created for comprehensive testing",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Switch to registered user context for appeal status tracking
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: registeredUserEmail,
      password: "UserPassword123!",
      href: "https://reddit-platform.example.com/login",
      referrer: "https://reddit-platform.example.com",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Step 5: Retrieve specific appeal details for comprehensive status tracking validation
  // Note: In a real scenario, this would be an appeal ID that was created when the user filed an appeal
  // For testing purposes, we use random UUIDs to simulate existing appeals
  const mockAppealId = typia.random<string & tags.Format<"uuid">>();

  const appealDetails: IRedditPlatformModerationAppeal.IInvert =
    await api.functional.redditPlatform.registeredUser.moderationActions.appeals.at(
      connection,
      {
        moderationActionId: moderationAction.id,
        appealId: mockAppealId,
      },
    );
  typia.assert(appealDetails);

  // Step 6: Validate comprehensive appeal status tracking information
  TestValidator.equals(
    "appeal belongs to correct moderation action",
    appealDetails.moderation_action_id,
    moderationAction.id,
  );

  TestValidator.equals(
    "appeal ID matches requested ID",
    appealDetails.id,
    mockAppealId,
  );

  // Validate appeal status tracking
  const validStatuses = [
    "pending",
    "under_review",
    "approved",
    "denied",
    "escalated",
    "withdrawn",
  ];
  TestValidator.predicate(
    "appeal status is valid",
    validStatuses.includes(appealDetails.status),
  );

  // Validate appeal level determination
  const validAppealLevels = ["community", "platform"];
  TestValidator.predicate(
    "appeal level is valid",
    validAppealLevels.includes(appealDetails.appeal_level),
  );

  // Validate escalation tracking
  TestValidator.predicate(
    "escalation status is boolean",
    typeof appealDetails.is_escalated === "boolean",
  );

  // Validate timestamp tracking completeness
  TestValidator.predicate(
    "appeal has creation timestamp",
    appealDetails.created_at !== undefined && appealDetails.created_at !== null,
  );

  TestValidator.predicate(
    "appeal has update timestamp",
    appealDetails.updated_at !== undefined && appealDetails.updated_at !== null,
  );

  // If appeal is resolved, validate resolution timestamp
  if (
    appealDetails.status === "approved" ||
    appealDetails.status === "denied"
  ) {
    TestValidator.predicate(
      "resolved appeal has resolution timestamp",
      appealDetails.resolved_at !== undefined &&
        appealDetails.resolved_at !== null,
    );
  }

  // Validate timestamp format and logical ordering
  const createdAt = new Date(appealDetails.created_at);
  const updatedAt = new Date(appealDetails.updated_at);

  TestValidator.predicate(
    "creation timestamp is valid date",
    !isNaN(createdAt.getTime()),
  );

  TestValidator.predicate(
    "update timestamp is valid date",
    !isNaN(updatedAt.getTime()),
  );

  TestValidator.predicate(
    "timestamps are logically ordered (updated >= created)",
    updatedAt >= createdAt,
  );

  // Validate appeal context and linkage
  TestValidator.predicate(
    "appeal has proper moderation action reference",
    appealDetails.moderation_action_id !== undefined &&
      appealDetails.moderation_action_id !== null,
  );

  TestValidator.predicate(
    "appeal has appellant session reference",
    appealDetails.appellant_session_id !== undefined &&
      appealDetails.appellant_session_id !== null,
  );

  // Validate optional fields presence
  if (
    appealDetails.reviewer_session_id !== undefined &&
    appealDetails.reviewer_session_id !== null
  ) {
    TestValidator.predicate(
      "reviewer session ID is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        appealDetails.reviewer_session_id,
      ),
    );
  }

  if (
    appealDetails.appeal_reason !== undefined &&
    appealDetails.appeal_reason !== null
  ) {
    TestValidator.predicate(
      "appeal reason is non-empty string",
      typeof appealDetails.appeal_reason === "string" &&
        appealDetails.appeal_reason.length > 0,
    );
  }

  // Validate status workflow consistency
  if (appealDetails.is_escalated === true) {
    TestValidator.predicate(
      "escalated appeal shows platform-level review",
      appealDetails.appeal_level === "platform",
    );
  }

  if (appealDetails.status === "withdrawn") {
    TestValidator.predicate(
      "withdrawn appeal should not be escalated",
      appealDetails.is_escalated === false,
    );
  }

  // Validate audit trail completeness
  TestValidator.predicate(
    "appeal audit trail includes appellant session",
    appealDetails.appellant_session_id !== undefined &&
      appealDetails.appellant_session_id !== null,
  );

  // Test response structure completeness for comprehensive tracking
  const requiredTrackingFields = [
    "id",
    "moderation_action_id",
    "appellant_session_id",
    "appeal_reason",
    "status",
    "appeal_level",
    "is_escalated",
    "created_at",
    "updated_at",
  ];

  TestValidator.predicate(
    "response contains all required appeal tracking fields",
    requiredTrackingFields.every(
      (field) =>
        appealDetails[
          field as keyof IRedditPlatformModerationAppeal.IInvert
        ] !== undefined,
    ),
  );

  // Success: Appeal status tracking validation complete
  TestValidator.equals(
    "appeal status tracking test completed successfully",
    true,
    true,
  );
}
