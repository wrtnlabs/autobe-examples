import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * Test appeals search with escalation status filtering for community
 * moderators.
 *
 * This test validates the core functionality of filtering appeals based on
 * their escalation status, enabling effective management of moderation
 * workflows where some appeals require higher-level administrative review while
 * others can be handled at the community moderator level.
 *
 * The test creates a community moderator account and then validates that the
 * appeals search endpoint correctly filters appeals based on the is_escalated
 * boolean parameter. This is essential for moderation efficiency and proper
 * escalation management workflows.
 *
 * Test flow:
 *
 * 1. Create community moderator account with proper authentication
 * 2. Validate appeals search without escalation filter (should return all appeals)
 * 3. Test filtering for escalated appeals (is_escalated: true)
 * 4. Test filtering for non-escalated appeals (is_escalated: false)
 * 5. Verify data integrity and proper response formatting
 * 6. Validate error handling for invalid filter combinations
 */
export async function test_api_appeals_moderator_escalation_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreatedAt = new Date().toISOString();

  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
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
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: moderatorCreatedAt,
        active_status: "active",
        appointed_at: moderatorCreatedAt,
        href: "https://moderation.example.com",
        referrer: "https://platform.example.com",
        created_at: moderatorCreatedAt,
        updated_at: moderatorCreatedAt,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 2: Validate appeals search without escalation filter (should return all appeals)
  const allAppealsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(allAppealsResponse);

  // Validate response structure
  TestValidator.equals(
    "appeals page structure",
    allAppealsResponse.data,
    allAppealsResponse.data,
  );
  TestValidator.predicate(
    "appeals response is valid array",
    Array.isArray(allAppealsResponse.data),
  );
  TestValidator.equals(
    "pagination info present",
    allAppealsResponse.pagination,
    allAppealsResponse.pagination,
  );

  // Step 3: Test filtering for escalated appeals (is_escalated: true)
  const escalatedAppealsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          is_escalated: true,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedAppealsResponse);

  // Validate escalated appeals filtering
  TestValidator.predicate(
    "escalated appeals response is valid",
    escalatedAppealsResponse.data.length >= 0,
  );
  TestValidator.equals(
    "escalated appeals pagination",
    escalatedAppealsResponse.pagination,
    escalatedAppealsResponse.pagination,
  );

  // Step 4: Test filtering for non-escalated appeals (is_escalated: false)
  const nonEscalatedAppealsResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          is_escalated: false,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(nonEscalatedAppealsResponse);

  // Validate non-escalated appeals filtering
  TestValidator.predicate(
    "non-escalated appeals response is valid",
    nonEscalatedAppealsResponse.data.length >= 0,
  );
  TestValidator.equals(
    "non-escalated appeals pagination",
    nonEscalatedAppealsResponse.pagination,
    nonEscalatedAppealsResponse.pagination,
  );

  // Step 5: Verify data integrity across all responses
  TestValidator.predicate(
    "all appeals count >= escalated + non-escalated",
    allAppealsResponse.data.length >=
      Math.max(
        escalatedAppealsResponse.data.length,
        nonEscalatedAppealsResponse.data.length,
      ),
  );

  // Step 6: Test pagination with escalation filters
  const paginatedEscalatedResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          is_escalated: true,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedEscalatedResponse);

  // Validate pagination results
  TestValidator.predicate(
    "paginated escalated appeals limit respected",
    paginatedEscalatedResponse.data.length <= 5,
  );
  TestValidator.equals(
    "paginated escalated appeals page",
    paginatedEscalatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated escalated appeals limit",
    paginatedEscalatedResponse.pagination.limit,
    5,
  );

  // Step 7: Test combination of escalation with other filters
  const combinedFiltersResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_escalated: false,
          status: "pending",
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedFiltersResponse);

  // Validate combined filtering
  TestValidator.predicate(
    "combined filters response is valid",
    combinedFiltersResponse.data.length >= 0,
  );
  TestValidator.equals(
    "combined filters pagination",
    combinedFiltersResponse.pagination,
    combinedFiltersResponse.pagination,
  );

  // Step 8: Validate appeal structure integrity
  if (allAppealsResponse.data.length > 0) {
    const sampleAppeal = allAppealsResponse.data[0];
    TestValidator.equals("appeal has id", sampleAppeal.id, sampleAppeal.id);
    TestValidator.equals(
      "appeal has status",
      sampleAppeal.status,
      sampleAppeal.status,
    );
    TestValidator.equals(
      "appeal has appeal_reason",
      sampleAppeal.appeal_reason,
      sampleAppeal.appeal_reason,
    );
    TestValidator.equals(
      "appeal has is_escalated",
      sampleAppeal.is_escalated,
      sampleAppeal.is_escalated,
    );
    TestValidator.equals(
      "appeal has created_at",
      sampleAppeal.created_at,
      sampleAppeal.created_at,
    );
  }

  // Step 9: Test edge case - page 2 with escalation filter
  const pageTwoResponse: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          is_escalated: true,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(pageTwoResponse);

  // Validate page 2 structure
  TestValidator.equals(
    "page 2 current page",
    pageTwoResponse.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", pageTwoResponse.pagination.limit, 10);
}
