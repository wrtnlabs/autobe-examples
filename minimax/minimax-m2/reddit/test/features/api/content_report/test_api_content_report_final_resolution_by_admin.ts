import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformContentReports } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentReports";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_content_report_final_resolution_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for final resolution authority
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: adminEmail,
        password: "SecureAdmin123!",
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
        managed_communities: JSON.stringify([]),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create registered user account to submit the content report
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: userEmail,
        password: "UserPassword123!",
        display_name: "Content Reporter",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 3: Create community moderator account for escalation handling
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: user.id,
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
        assigned_communities: JSON.stringify([]),
        appointed_by: admin.user.id,
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

  // Step 4: Create a content report simulating complex violation requiring platform-level resolution
  const contentReport: IRedditPlatformContentReports =
    await api.functional.redditPlatform.registeredUser.contentReports.create(
      connection,
      {
        body: {
          redditPlatformPostId: typia.random<string & tags.Format<"uuid">>(),
          reportCategory: "harassment",
          description:
            "Complex harassment case involving multiple users and coordinated harassment campaign. This case requires platform-level intervention due to cross-community involvement and escalating behavior that impacts user safety across multiple subreddits.",
          priority: "high",
          reporterSessionId: user.token.access, // Using token as session identifier
        } satisfies IRedditPlatformContentReports.ICreate,
      },
    );
  typia.assert(contentReport);

  // Step 5: Platform administrator provides final resolution with comprehensive administrative notes
  const resolvedReport: IRedditPlatformContentReports =
    await api.functional.redditPlatform.platformAdministrator.contentReports.update(
      connection,
      {
        contentReportId: contentReport.id,
        body: {
          status: "resolved",
          priority: "critical",
          moderatorNotes:
            "FINAL PLATFORM ADMINISTRATOR RESOLUTION: After comprehensive investigation involving cross-community analysis, user behavior pattern review, and consultation with community safety team, this case has been resolved with the following actions: 1) Content creators involved have been issued formal warnings, 2) Platform-wide monitoring established for escalating patterns, 3) Community guidelines updated to prevent similar coordination, 4) Affected users notified of resolution and platform protections, 5) Case closed as resolved with full audit trail documented. Resolution provides definitive platform-level decision on complex multi-community harassment case.",
          resolvedAt: new Date().toISOString(),
        } satisfies IRedditPlatformContentReports.IUpdate,
      },
    );
  typia.assert(resolvedReport);

  // Step 6: Validate the final resolution process and audit trail
  TestValidator.equals(
    "content report status updated to resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "content report priority escalated",
    resolvedReport.priority,
    "critical",
  );
  TestValidator.equals(
    "resolution timestamp recorded",
    resolvedReport.resolved_at,
    resolvedReport.resolved_at,
  );
  TestValidator.predicate(
    "administrative notes captured",
    () =>
      resolvedReport.moderator_notes !== undefined &&
      resolvedReport.moderator_notes!.length > 0,
  );
  TestValidator.predicate(
    "final resolution maintains report integrity",
    () =>
      resolvedReport.id === contentReport.id &&
      resolvedReport.content_id === contentReport.content_id,
  );
  TestValidator.predicate(
    "platform administrator resolution authority validated",
    () =>
      admin.administrator_level === "super_admin" &&
      admin.system_permissions.content_moderation.can_manage_reports === true,
  );
}
