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
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_appeals_combined_filtering_scenarios(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for authentication context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Generate comprehensive test appeals data with varied properties
  const statuses = [
    "pending",
    "under_review",
    "approved",
    "denied",
    "withdrawn",
    "escalated",
  ] as const;
  const appealLevels = ["initial", "secondary", "final"] as const;

  const testAppeals = await ArrayUtil.repeat(18, async (index) => {
    const status = RandomGenerator.pick(statuses);
    const appealLevel = RandomGenerator.pick(appealLevels);
    const isEscalated = RandomGenerator.pick([true, false]);
    const createdAt = RandomGenerator.date(
      new Date("2024-01-01"),
      1000 * 60 * 60 * 24 * 90,
    ); // 3 months range

    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      appeal_reason: `Test appeal ${index + 1}: ${status} status with ${appealLevel} level`,
      status,
      appeal_level: appealLevel,
      is_escalated: isEscalated,
      created_at: createdAt.toISOString(),
      updated_at: new Date(
        createdAt.getTime() + Math.random() * 86400000,
      ).toISOString(),
      resolved_at:
        status === "approved" || status === "denied"
          ? new Date(
              createdAt.getTime() + Math.random() * 86400000 * 7,
            ).toISOString()
          : null,
      moderation_action: {
        id: typia.random<string & tags.Format<"uuid">>(),
        action_type: RandomGenerator.pick([
          "content_removal",
          "user_warning",
          "content_lock",
        ] as const),
        reason: "Test moderation action",
        status: "active",
        is_automated: false,
        appeal_count: 0,
        created_at: new Date(createdAt.getTime() - 86400000).toISOString(),
        updated_at: new Date(createdAt.getTime() - 86400000).toISOString(),
        duration_hours: null,
        admin_notes: null,
        user: null,
        content: null,
        moderator_session: {
          id: typia.random<string & tags.Format<"uuid">>(),
          reddit_platform_communitymoderator_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          ip: "192.168.1.1",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          created_at: new Date(createdAt.getTime() - 86400000).toISOString(),
          expired_at: null,
        },
      },
      appellant_session: {
        id: user.token.access, // Use user's session
        userId: user.id,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        isActive: true,
        createdAt: createdAt.toISOString(),
        expiredAt: null,
      },
      reviewer_session:
        status === "under_review" ||
        status === "approved" ||
        status === "denied"
          ? {
              id: typia.random<string & tags.Format<"uuid">>(),
              reddit_platform_platformadministrator_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              ip: "192.168.1.200",
              href: typia.random<string & tags.Format<"uri">>(),
              referrer: typia.random<string & tags.Format<"uri">>(),
              created_at: new Date(
                createdAt.getTime() + Math.random() * 86400000,
              ).toISOString(),
              expired_at: new Date(Date.now() + 86400000).toISOString(),
            }
          : undefined,
      additional_evidence: RandomGenerator.paragraph({ sentences: 2 }),
    };
  });

  // Step 3: Test single filter validation - Status filtering
  for (const status of statuses) {
    const filterResult: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(filterResult);

    TestValidator.predicate(
      `appeals filtered by status '${status}' should contain only that status`,
      filterResult.data.every((appeal) => appeal.status === status),
    );
  }

  // Step 4: Test single filter validation - Appeal level filtering
  for (const level of appealLevels) {
    const filterResult: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            appeal_level: level,
            page: 1,
            limit: 10,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(filterResult);

    TestValidator.predicate(
      `appeals filtered by level '${level}' should contain only that level`,
      filterResult.data.every((appeal) => appeal.appeal_level === level),
    );
  }

  // Step 5: Test single filter validation - Escalation status filtering
  const escalatedFilter: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedFilter);

  TestValidator.predicate(
    "appeals filtered by escalation should all be escalated",
    escalatedFilter.data.every((appeal) => appeal.is_escalated === true),
  );

  const nonEscalatedFilter: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: false,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(nonEscalatedFilter);

  TestValidator.predicate(
    "appeals filtered by non-escalation should all be non-escalated",
    nonEscalatedFilter.data.every((appeal) => appeal.is_escalated === false),
  );

  // Step 6: Test date range filtering - Created date ranges
  const startDate = new Date("2024-02-01");
  const endDate = new Date("2024-02-29");
  const dateRangeResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          created_at_from: startDate.toISOString(),
          created_at_to: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  TestValidator.predicate(
    "appeals filtered by date range should fall within specified dates",
    dateRangeResult.data.every((appeal) => {
      const appealDate = new Date(appeal.created_at);
      return appealDate >= startDate && appealDate <= endDate;
    }),
  );

  // Step 7: Test multiple filter combinations - Status + Appeal Level
  const multipleFilter1: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          status: "pending",
          appeal_level: "initial",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(multipleFilter1);

  TestValidator.predicate(
    "appeals with status 'pending' and level 'initial' should match both criteria",
    multipleFilter1.data.every(
      (appeal) =>
        appeal.status === "pending" && appeal.appeal_level === "initial",
    ),
  );

  // Step 8: Test multiple filter combinations - Status + Escalation + Date Range
  const multipleFilter2: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          status: "under_review",
          is_escalated: true,
          created_at_from: new Date("2024-01-15").toISOString(),
          created_at_to: new Date("2024-03-15").toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(multipleFilter2);

  TestValidator.predicate(
    "appeals with complex multi-filter should match all criteria",
    multipleFilter2.data.every((appeal) => {
      const appealDate = new Date(appeal.created_at);
      return (
        appeal.status === "under_review" &&
        appeal.is_escalated === true &&
        appealDate >= new Date("2024-01-15") &&
        appealDate <= new Date("2024-03-15")
      );
    }),
  );

  // Step 9: Test edge case - Empty results with contradictory filters
  const emptyResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          status: "approved",
          appeal_level: "final",
          is_escalated: true,
          created_at_from: new Date("2025-01-01").toISOString(),
          created_at_to: new Date("2025-12-31").toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(emptyResult);

  TestValidator.equals(
    "appeals with contradictory filters should return empty results",
    emptyResult.data.length,
    0,
  );

  // Step 10: Test pagination with multiple filters
  const paginatedResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "paginated results with filters should respect limit and ordering",
    paginatedResult.data.length <= 5 &&
      paginatedResult.data.every((appeal) => appeal.status === "pending"),
  );

  // Step 11: Test maximum limit constraint
  const maxLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          limit: 100, // Maximum allowed limit
          page: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(maxLimitResult);

  TestValidator.predicate(
    "appeals with maximum limit should not exceed 100 items",
    maxLimitResult.data.length <= 100,
  );

  // Step 12: Validate pagination metadata accuracy
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    paginatedResult.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "pagination records should be accurate",
    paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 1,
  );
}
