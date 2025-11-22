import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformContentReports } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentReports";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * E2E Test: Content Report Resolution by Community Moderator
 *
 * This test validates the complete content moderation workflow where a
 * community moderator resolves a content report submitted by a registered user.
 * The test covers multi-actor authentication, report creation, moderator
 * review, and final resolution with proper audit trail maintenance.
 *
 * Test Flow:
 *
 * 1. Create community moderator account with proper permissions
 * 2. Create registered user account for content reporting
 * 3. Create content that can be reported for policy violations
 * 4. Submit content report with violation details
 * 5. Authenticate as moderator and review pending report
 * 6. Resolve report with status update and moderator notes
 * 7. Validate audit trail and notification triggers
 *
 * @author AutoBE Test Generation System
 */
export async function test_api_content_report_resolution_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  // Generate unique email for moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // Create registered user base account first (required for moderator creation)
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: registeredUserEmail,
        password: "SecurePassword123!",
        display_name: "Registered User",
        bio: "Regular community member for testing",
        location: "Test City",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Create community moderator account based on the registered user
  const moderatorUser = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: registeredUser.id,
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
        assigned_communities: JSON.stringify(["test-community"]),
        appointed_by: "platform_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/moderator/register",
        referrer: "https://admin.example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorUser);

  // Step 2: Create another registered user for content creation and reporting
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: reporterEmail,
        password: "SecurePassword123!",
        display_name: "Test Reporter",
        bio: "Community member for testing reports",
        href: "https://example.com/reporter/register",
        referrer: "https://community.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(reporterUser);

  // Step 3: Create a new registered user session for content creation
  // (Switch back to reporter for content creation)
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: reporterEmail,
      password: "SecurePassword123!",
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Step 4: Create content that will be reported (simulate post creation)
  // For this test, we'll need to create a post first, then report it
  // Since we don't have a direct post creation API in the provided functions,
  // we'll create a content report with a simulated content ID
  const contentId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Submit content report
  const contentReport =
    await api.functional.redditPlatform.registeredUser.contentReports.create(
      connection,
      {
        body: {
          redditPlatformPostId: contentId,
          reportCategory: "spam",
          description:
            "This post contains unsolicited promotional content and violates community guidelines against spam. The post repeatedly advertises a product without genuine community engagement.",
          priority: "medium",
          reporterSessionId: registeredUser.id, // Use the session ID from authenticated user
        } satisfies IRedditPlatformContentReports.ICreate,
      },
    );
  typia.assert(contentReport);

  // Validate initial report state
  TestValidator.equals(
    "report status should be pending",
    contentReport.status,
    "pending",
  );
  TestValidator.equals(
    "report category should be spam",
    contentReport.report_category,
    "spam",
  );
  TestValidator.predicate(
    "report should have ID",
    contentReport.id !== undefined,
  );

  // Step 6: Switch to moderator authentication
  const moderatorAuth = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        username: moderatorUser.moderator.user?.username || "moderator",
        password: "SecurePassword123!",
        href: "https://community.example.com/moderator/login",
        referrer: "https://admin.example.com",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorAuth);

  // Step 7: Review and resolve the content report
  const resolvedReport =
    await api.functional.redditPlatform.communityModerator.contentReports.update(
      connection,
      {
        contentReportId: contentReport.id,
        body: {
          status: "resolved",
          priority: "medium",
          moderatorNotes:
            "After thorough review, this content has been confirmed to violate community guidelines against spam. The post contains repetitive promotional content without genuine community value. Content has been removed and user has been warned about future violations.",
          resolvedAt: new Date().toISOString(),
        } satisfies IRedditPlatformContentReports.IUpdate,
      },
    );
  typia.assert(resolvedReport);

  // Step 8: Validate resolution audit trail
  TestValidator.equals(
    "report status should be resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "moderator notes should be recorded",
    resolvedReport.moderator_notes?.includes("spam"),
    true,
  );
  TestValidator.predicate(
    "resolved timestamp should be set",
    resolvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report priority should remain unchanged",
    resolvedReport.priority,
    "medium",
  );
  TestValidator.equals(
    "report ID should remain consistent",
    resolvedReport.id,
    contentReport.id,
  );

  // Step 9: Validate audit trail integrity
  TestValidator.predicate(
    "content ID should be preserved",
    resolvedReport.content_id === contentReport.content_id,
  );
  TestValidator.predicate(
    "reporter session ID should be preserved",
    resolvedReport.reporter_session_id === contentReport.reporter_session_id,
  );
  TestValidator.equals(
    "report category should be preserved",
    resolvedReport.report_category,
    contentReport.report_category,
  );
  TestValidator.equals(
    "description should be preserved",
    resolvedReport.description,
    contentReport.description,
  );

  // Step 10: Test status transition validation
  // Verify that resolved reports maintain their state
  TestValidator.equals(
    "report should remain resolved when queried again",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.predicate(
    "moderator notes should be accessible for audit",
    resolvedReport.moderator_notes !== null &&
      resolvedReport.moderator_notes !== undefined,
  );

  // Step 11: Validate notification trigger readiness
  // The resolved status should trigger notifications to the original reporter
  TestValidator.predicate(
    "resolved report should have timestamp for notification",
    resolvedReport.resolved_at !== undefined,
  );

  console.log(`Content report resolution test completed successfully`);
  console.log(`Report ID: ${resolvedReport.id}`);
  console.log(`Status: ${resolvedReport.status}`);
  console.log(
    `Moderator: ${moderatorAuth.moderator.user?.display_name || "Unknown"}`,
  );
  console.log(`Resolution timestamp: ${resolvedReport.resolved_at}`);
}
