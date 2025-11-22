import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_moderation_appeals_filter_escalated(
  connection: api.IConnection,
) {
  // 1. Create platform administrator for escalation management
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.Pattern<"^[a-zA-Z0-9_]+$"> &
            tags.MinLength<3> &
            tags.MaxLength<20>
        >(),
        email: adminEmail,
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
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
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Test appeal search with escalation filtering - should return empty initially
  const emptyAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(emptyAppeals);
  TestValidator.equals(
    "escalated appeals should be empty initially",
    emptyAppeals.data.length,
    0,
  );

  // 3. Test appeal search with non-escalated filtering - should also return empty initially
  const emptyNonEscalated: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: false,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(emptyNonEscalated);
  TestValidator.equals(
    "non-escalated appeals should be empty initially",
    emptyNonEscalated.data.length,
    0,
  );

  // 4. Test appeal search without escalation filter - should return all appeals (empty in this case)
  const allAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(allAppeals);
  TestValidator.equals(
    "all appeals should be empty initially",
    allAppeals.data.length,
    0,
  );

  // 5. Validate pagination information is consistent across all filtered searches
  TestValidator.equals(
    "pagination should be consistent",
    emptyAppeals.pagination.current,
    emptyNonEscalated.pagination.current,
  );
  TestValidator.equals(
    "pagination limit should match request",
    emptyAppeals.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records should be zero initially",
    emptyAppeals.pagination.records,
    0,
  );

  // 6. Test escalation filter with different page numbers
  const page2Escalated: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(page2Escalated);
  TestValidator.equals(
    "page 2 escalated appeals should be empty",
    page2Escalated.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should reflect page 2",
    page2Escalated.pagination.current,
    2,
  );

  // 7. Test combined filtering - escalation with status filter (should still be empty)
  const escalatedWithStatus: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedWithStatus);
  TestValidator.equals(
    "escalated pending appeals should be empty",
    escalatedWithStatus.data.length,
    0,
  );

  // 8. Test filtering with different escalation values
  const trueEscalated: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 1,
          limit: 15,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(trueEscalated);

  const falseEscalated: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: false,
          page: 1,
          limit: 15,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(falseEscalated);

  // 9. Validate that results are consistent - both should be empty but structure should be valid
  TestValidator.equals(
    "both filtered results should have same length",
    trueEscalated.data.length,
    falseEscalated.data.length,
  );
  TestValidator.equals(
    "both should have valid pagination structure",
    typeof trueEscalated.pagination.current,
    "number",
  );
  TestValidator.equals(
    "both should have same limit",
    trueEscalated.pagination.limit,
    falseEscalated.pagination.limit,
  );

  // 10. Test sorting with escalation filter
  const sortedEscalated: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          order_by: "created_at",
          order_direction: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedEscalated);
  TestValidator.equals(
    "sorted escalated appeals should maintain structure",
    sortedEscalated.data.length,
    0,
  );
}
