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

/**
 * Test basic appeals search functionality for registered users.
 *
 * A registered user should be able to search and filter their own moderation
 * appeals with various criteria including status, appeal level, date ranges,
 * and pagination. Validates that users can only see their own appeals and that
 * search filters work correctly for individual appeal management.
 */
export async function test_api_appeals_basic_search_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      location: RandomGenerator.name(1),
      website_url: `https://${RandomGenerator.alphabets(6)}.example.com`,
      avatar_url: `https://avatar.example.com/${RandomGenerator.alphabets(12)}`,
      href: "https://test.example.com/appeals-test",
      referrer: "https://test.example.com/referrer",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user);

  // Helper function to validate appeal data structure
  const validateAppealData = (
    appeal: IRedditPlatformModerationAppeal.ISummary,
  ) => {
    TestValidator.predicate(
      "appeal has valid id",
      !!appeal.id && typeof appeal.id === "string",
    );
    TestValidator.predicate(
      "appeal has valid status",
      !!appeal.status && typeof appeal.status === "string",
    );
    TestValidator.predicate(
      "appeal has valid appeal_level",
      !!appeal.appeal_level && typeof appeal.appeal_level === "string",
    );
    TestValidator.predicate(
      "appeal has valid created_at",
      !!appeal.created_at && typeof appeal.created_at === "string",
    );
    TestValidator.predicate(
      "appeal has valid is_escalated",
      typeof appeal.is_escalated === "boolean",
    );
    TestValidator.predicate(
      "appeal has moderation_action",
      !!appeal.moderation_action,
    );
    TestValidator.predicate(
      "appeal has appellant_session",
      !!appeal.appellant_session,
    );
  };

  // Helper function to validate pagination
  const validatePagination = (
    response: IPageIRedditPlatformModerationAppeal.ISummary,
  ) => {
    TestValidator.predicate("pagination exists", !!response.pagination);
    TestValidator.predicate(
      "pagination current is valid",
      typeof response.pagination.current === "number" &&
        response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is valid",
      typeof response.pagination.limit === "number" &&
        response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records is valid",
      typeof response.pagination.records === "number" &&
        response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is valid",
      typeof response.pagination.pages === "number" &&
        response.pagination.pages >= 0,
    );
  };

  // Step 2: Test basic appeals search with default parameters
  const defaultSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {} satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(defaultSearch);

  // Validate pagination structure
  TestValidator.equals(
    "default pagination current page",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultSearch.pagination.limit,
    20,
  );
  validatePagination(defaultSearch);

  // Validate data array exists and structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultSearch.data),
  );
  if (defaultSearch.data.length > 0) {
    defaultSearch.data.forEach((appeal) => {
      validateAppealData(appeal);
    });
  }

  // Step 3: Test search with pagination parameters
  const paginatedSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  TestValidator.equals(
    "pagination page parameter",
    paginatedSearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit parameter",
    paginatedSearch.pagination.limit,
    10,
  );
  if (paginatedSearch.data.length > 0) {
    paginatedSearch.data.forEach((appeal) => {
      validateAppealData(appeal);
    });
  }

  // Step 4: Test search with status filter
  const statusFilterSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          status: "pending",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(statusFilterSearch);

  // Validate all returned appeals have matching status (if any appeals exist)
  if (statusFilterSearch.data.length > 0) {
    const allPending = statusFilterSearch.data.every(
      (appeal) => appeal.status === "pending",
    );
    TestValidator.predicate("all appeals match status filter", allPending);
  }

  // Step 5: Test search with appeal level filter
  const levelFilterSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          appeal_level: "initial",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(levelFilterSearch);

  // Validate appeal level filtering
  if (levelFilterSearch.data.length > 0) {
    const allInitial = levelFilterSearch.data.every(
      (appeal) => appeal.appeal_level === "initial",
    );
    TestValidator.predicate("all appeals match level filter", allInitial);
  }

  // Step 6: Test search with date range filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneDayFromNow = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const dateRangeSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          created_at_from: oneDayAgo,
          created_at_to: oneDayFromNow,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(dateRangeSearch);

  if (dateRangeSearch.data.length > 0) {
    dateRangeSearch.data.forEach((appeal) => {
      validateAppealData(appeal);
    });
  }

  // Step 7: Test search with multiple filters combined
  const multiFilterSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "under_review",
          appeal_level: "secondary",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(multiFilterSearch);

  // Validate pagination with filters
  TestValidator.equals(
    "filtered search pagination",
    multiFilterSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered search limit",
    multiFilterSearch.pagination.limit,
    5,
  );
  if (multiFilterSearch.data.length > 0) {
    multiFilterSearch.data.forEach((appeal) => {
      validateAppealData(appeal);
    });
  }

  // Step 8: Test sorting by different fields
  const sortByResolvedSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "resolved_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortByResolvedSearch);

  if (sortByResolvedSearch.data.length > 0) {
    sortByResolvedSearch.data.forEach((appeal) => {
      validateAppealData(appeal);
    });
  }

  // Step 9: Test sorting by appeal level
  const sortByLevelSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          order_by: "appeal_level",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortByLevelSearch);

  if (sortByLevelSearch.data.length > 0) {
    sortByLevelSearch.data.forEach((appeal) => {
      validateAppealData(appeal);
    });
  }

  // Step 10: Validate escalation filter
  const escalatedSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedSearch);

  // Validate escalated filter
  if (escalatedSearch.data.length > 0) {
    const allEscalated = escalatedSearch.data.every(
      (appeal) => appeal.is_escalated === true,
    );
    TestValidator.predicate("all appeals match escalated filter", allEscalated);
  }

  // Step 11: Test non-escalated filter
  const nonEscalatedSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: false,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(nonEscalatedSearch);

  // Validate non-escalated filter
  if (nonEscalatedSearch.data.length > 0) {
    const allNonEscalated = nonEscalatedSearch.data.every(
      (appeal) => appeal.is_escalated === false,
    );
    TestValidator.predicate(
      "all appeals match non-escalated filter",
      allNonEscalated,
    );
  }

  // Step 12: Test that appeals belong to the authenticated user
  // This validates access control - user should only see their own appeals
  const allSearchResults = [
    defaultSearch,
    paginatedSearch,
    statusFilterSearch,
    levelFilterSearch,
    dateRangeSearch,
    multiFilterSearch,
    sortByResolvedSearch,
    sortByLevelSearch,
    escalatedSearch,
    nonEscalatedSearch,
  ];

  for (const response of allSearchResults) {
    for (const appeal of response.data) {
      // Verify the appellant session belongs to our test user
      TestValidator.equals(
        "appeal belongs to authenticated user",
        appeal.appellant_session.userId,
        user.id,
      );
    }
  }

  // Step 13: Test boundary conditions for pagination
  const boundarySearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 100,
          limit: 100,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(boundarySearch);

  // Validate boundary condition handling
  TestValidator.equals(
    "boundary page number",
    boundarySearch.pagination.current,
    100,
  );
  TestValidator.equals("boundary limit", boundarySearch.pagination.limit, 100);
  TestValidator.predicate(
    "boundary records count is valid",
    boundarySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "boundary pages calculation is valid",
    boundarySearch.pagination.pages >= 0,
  );

  // Step 14: Test edge case - empty results
  const emptyResultsSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 999999,
          limit: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(emptyResultsSearch);

  // Validate empty results handling
  TestValidator.predicate(
    "empty results have valid pagination",
    !!emptyResultsSearch.pagination,
  );
  TestValidator.predicate(
    "empty results data is array",
    Array.isArray(emptyResultsSearch.data),
  );
  TestValidator.equals(
    "empty results length is zero",
    emptyResultsSearch.data.length,
    0,
  );

  // Step 15: Test all status values
  const validStatuses = [
    "pending",
    "under_review",
    "approved",
    "denied",
    "withdrawn",
    "escalated",
  ];
  for (const status of validStatuses) {
    const statusSearch =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            status: status,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(statusSearch);

    // Validate structure even if empty
    if (statusSearch.data.length > 0) {
      statusSearch.data.forEach((appeal) => {
        validateAppealData(appeal);
      });
    }
  }

  // Step 16: Test all appeal levels
  const validLevels = ["initial", "secondary", "final"];
  for (const level of validLevels) {
    const levelSearch =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            appeal_level: level,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(levelSearch);

    // Validate structure even if empty
    if (levelSearch.data.length > 0) {
      levelSearch.data.forEach((appeal) => {
        validateAppealData(appeal);
      });
    }
  }

  // Step 17: Test all order by options
  const orderByOptions = [
    "created_at",
    "updated_at",
    "resolved_at",
    "appeal_level",
  ] as const;
  for (const orderBy of orderByOptions) {
    const orderSearch =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            order_by: orderBy,
            order_direction: "asc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(orderSearch);

    if (orderSearch.data.length > 0) {
      orderSearch.data.forEach((appeal) => {
        validateAppealData(appeal);
      });
    }
  }

  // Final validation: Ensure all responses maintain consistent data integrity
  const allFinalResponses = [
    emptyResultsSearch,
    ...validStatuses.map((status) =>
      api.functional.redditPlatform.registeredUser.appeals.index(connection, {
        body: { status } satisfies IRedditPlatformModerationAppeal.IRequest,
      }),
    ),
    ...validLevels.map((level) =>
      api.functional.redditPlatform.registeredUser.appeals.index(connection, {
        body: {
          appeal_level: level,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      }),
    ),
  ];

  // Wait for all final API calls
  const finalResults = await Promise.all(allFinalResponses);
  finalResults.forEach((result) => {
    typia.assert(result);
    validatePagination(result);
  });
}
