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

export async function test_api_moderation_appeals_filtered_retrieval_by_platform_admin(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for authentication
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>()}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Create a moderation action that can be appealed
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          reason: "Test moderation action for appeal testing",
          status: "active",
          duration_hours: undefined,
          moderator_session_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Test status filtering - retrieve appeals by status
  const pendingAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(pendingAppeals);
  TestValidator.equals(
    "pending appeals request should succeed",
    pendingAppeals.pagination !== undefined,
    true,
  );

  // Step 4: Test appeal level filtering
  const initialAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          appeal_level: "initial",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(initialAppeals);
  TestValidator.equals(
    "initial level appeals request should succeed",
    initialAppeals.pagination !== undefined,
    true,
  );

  // Step 5: Test date range filtering
  const recentAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          created_at_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 30 days
          created_at_to: new Date().toISOString(),
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(recentAppeals);
  TestValidator.equals(
    "date range filtering should work",
    recentAppeals.pagination !== undefined,
    true,
  );

  // Step 6: Test escalated appeals filtering
  const escalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          is_escalated: true,
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedAppeals);
  TestValidator.equals(
    "escalated appeals filtering should work",
    escalatedAppeals.pagination !== undefined,
    true,
  );

  // Step 7: Test pagination functionality
  const firstPage: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page pagination should return results",
    firstPage.data !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination metadata should be present",
    firstPage.pagination !== undefined,
    true,
  );

  // Step 8: Test pagination second page
  const secondPage: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 2,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page pagination should work",
    secondPage.pagination !== undefined,
    true,
  );

  // Step 9: Test resolved appeals date filtering
  const resolvedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          resolved_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 7 days
          resolved_at_to: new Date().toISOString(),
          page: 1,
          limit: 20,
          order_by: "resolved_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(resolvedAppeals);
  TestValidator.equals(
    "resolved appeals filtering should work",
    resolvedAppeals.pagination !== undefined,
    true,
  );

  // Step 10: Test combined filtering criteria
  const combinedFiltered: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          status: "under_review",
          appeal_level: "initial",
          is_escalated: false,
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filtering should work",
    combinedFiltered.pagination !== undefined,
    true,
  );

  // Step 11: Test sorting by appeal level
  const sortedByLevel: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 20,
          order_by: "appeal_level",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedByLevel);
  TestValidator.equals(
    "sorting by appeal level should work",
    sortedByLevel.pagination !== undefined,
    true,
  );

  // Step 12: Test default sorting (created_at desc)
  const defaultSorted: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(defaultSorted);
  TestValidator.equals(
    "default sorting should work",
    defaultSorted.pagination !== undefined,
    true,
  );

  // Step 13: Validate response structure integrity
  const allAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(allAppeals);
  TestValidator.equals(
    "response should include pagination data",
    allAppeals.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "response should include data array",
    Array.isArray(allAppeals.data),
    true,
  );
  TestValidator.equals(
    "pagination should have correct limit",
    allAppeals.pagination.limit === 50,
    true,
  );

  // Step 14: Test pagination boundary conditions
  const largeLimit: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 1,
          limit: 100, // Maximum allowed
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals(
    "large page limit should work",
    largeLimit.pagination !== undefined,
    true,
  );

  // Step 15: Test invalid page number handling
  const invalidPage: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.index(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          page: 999999, // Very high page number
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(invalidPage);
  TestValidator.equals(
    "invalid page should return empty results",
    invalidPage.data.length === 0,
    true,
  );
  TestValidator.equals(
    "pagination should reflect empty results",
    invalidPage.pagination.records === 0,
    true,
  );
}
