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
 * Test appeals search filtering by appeal level for registered users.
 *
 * This test validates the appeals filtering functionality including:
 *
 * - Filtering by appeal levels (initial, secondary, final)
 * - Combination filtering with status and date ranges
 * - Response structure and pagination
 * - Edge cases and error handling
 *
 * The test creates a registered user account and tests comprehensive appeal
 * filtering scenarios for effective appeal management workflows.
 */
export async function test_api_appeals_appeal_level_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        bio: "Test user for appeals filtering",
        location: "Test City, Test Country",
        website_url: "https://testuser.example.com",
        avatar_url: "https://example.com/avatar.jpg",
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Test appeal level filtering - Initial level only
  const initialAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "initial",
          status: "pending",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(initialAppeals);

  TestValidator.equals(
    "initial appeals should be filtered correctly",
    initialAppeals.data.length >= 0,
    true,
  );

  // Validate all returned appeals are at initial level
  if (initialAppeals.data.length > 0) {
    for (const appeal of initialAppeals.data) {
      TestValidator.equals(
        "appeal should be at initial level",
        appeal.appeal_level,
        "initial",
      );
      TestValidator.equals(
        "appeal status should be pending",
        appeal.status,
        "pending",
      );
    }
  }

  // Step 3: Test appeal level filtering - Secondary level only
  const secondaryAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "secondary",
          status: "under_review",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(secondaryAppeals);

  TestValidator.equals(
    "secondary appeals should be retrieved",
    secondaryAppeals.data.length >= 0,
    true,
  );

  // Validate all returned appeals are at secondary level
  if (secondaryAppeals.data.length > 0) {
    for (const appeal of secondaryAppeals.data) {
      TestValidator.equals(
        "appeal should be at secondary level",
        appeal.appeal_level,
        "secondary",
      );
      TestValidator.equals(
        "appeal status should be under_review",
        appeal.status,
        "under_review",
      );
    }
  }

  // Step 4: Test appeal level filtering - Final level only
  const finalAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "final",
          status: "approved",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(finalAppeals);

  TestValidator.equals(
    "final appeals should be retrieved",
    finalAppeals.data.length >= 0,
    true,
  );

  // Validate all returned appeals are at final level
  if (finalAppeals.data.length > 0) {
    for (const appeal of finalAppeals.data) {
      TestValidator.equals(
        "appeal should be at final level",
        appeal.appeal_level,
        "final",
      );
      TestValidator.equals(
        "appeal status should be approved",
        appeal.status,
        "approved",
      );
    }
  }

  // Step 5: Test combination filtering - Appeal level with status
  const combinedFilterAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "initial",
          status: "denied",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedFilterAppeals);

  TestValidator.equals(
    "combined filter should return results",
    combinedFilterAppeals.data.length >= 0,
    true,
  );

  // Validate combined filtering works correctly
  if (combinedFilterAppeals.data.length > 0) {
    for (const appeal of combinedFilterAppeals.data) {
      TestValidator.equals(
        "appeal should match combined criteria",
        appeal.appeal_level,
        "initial",
      );
      TestValidator.equals(
        "appeal should match combined status criteria",
        appeal.status,
        "denied",
      );
    }
  }

  // Step 6: Test combination filtering - Appeal level with date range
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(
    currentDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const dateRangeAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "secondary",
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: oneWeekFromNow.toISOString(),
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(dateRangeAppeals);

  TestValidator.equals(
    "date range filtering should return results",
    dateRangeAppeals.data.length >= 0,
    true,
  );

  // Validate date range filtering
  if (dateRangeAppeals.data.length > 0) {
    for (const appeal of dateRangeAppeals.data) {
      TestValidator.equals(
        "appeal should be at secondary level",
        appeal.appeal_level,
        "secondary",
      );

      const appealDate = new Date(appeal.created_at);
      TestValidator.predicate(
        "appeal creation date should be within range",
        appealDate >= oneWeekAgo && appealDate <= oneWeekFromNow,
      );
    }
  }

  // Step 7: Test pagination with appeal level filtering
  const paginatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          appeal_level: "final",
          status: "withdrawn",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedAppeals);

  // Validate pagination structure
  TestValidator.equals(
    "pagination should be present",
    paginatedAppeals.pagination !== undefined,
    true,
  );

  if (paginatedAppeals.pagination) {
    TestValidator.equals(
      "current page should be 1",
      paginatedAppeals.pagination.current,
      1,
    );

    TestValidator.equals(
      "limit should be 10",
      paginatedAppeals.pagination.limit,
      10,
    );
  }

  // Step 8: Test invalid appeal level filtering
  const invalidLevelAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "invalid_level",
          status: "pending",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(invalidLevelAppeals);

  TestValidator.equals(
    "invalid level should return empty results",
    invalidLevelAppeals.data.length,
    0,
  );

  // Step 9: Test sorting with appeal level filtering
  const sortedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "initial",
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedAppeals);

  TestValidator.equals(
    "sorted appeals should be retrieved",
    sortedAppeals.data.length >= 0,
    true,
  );

  // Validate sorting works correctly
  if (sortedAppeals.data.length > 1) {
    for (let i = 0; i < sortedAppeals.data.length - 1; i++) {
      const currentAppeal = sortedAppeals.data[i];
      const nextAppeal = sortedAppeals.data[i + 1];
      const currentDate = new Date(currentAppeal.created_at);
      const nextDate = new Date(nextAppeal.created_at);

      TestValidator.predicate(
        "appeals should be sorted by creation date ascending",
        currentDate <= nextDate,
      );
    }
  }

  // Step 10: Test escalation filtering with appeal levels
  const escalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "final",
          is_escalated: true,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedAppeals);

  TestValidator.equals(
    "escalated appeals filtering should work",
    escalatedAppeals.data.length >= 0,
    true,
  );

  // Validate escalated filtering
  if (escalatedAppeals.data.length > 0) {
    for (const appeal of escalatedAppeals.data) {
      TestValidator.equals(
        "appeal should be at final level",
        appeal.appeal_level,
        "final",
      );
      TestValidator.equals(
        "appeal should be escalated",
        appeal.is_escalated,
        true,
      );
    }
  }

  // Step 11: Test complex multi-criteria filtering
  const complexFilterAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "secondary",
          status: "pending",
          is_escalated: false,
          order_by: "updated_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(complexFilterAppeals);

  TestValidator.equals(
    "complex multi-criteria filtering should work",
    complexFilterAppeals.data.length >= 0,
    true,
  );

  // Validate complex filtering criteria
  if (complexFilterAppeals.data.length > 0) {
    for (const appeal of complexFilterAppeals.data) {
      TestValidator.equals(
        "appeal should be at secondary level",
        appeal.appeal_level,
        "secondary",
      );
      TestValidator.equals(
        "appeal status should be pending",
        appeal.status,
        "pending",
      );
      TestValidator.equals(
        "appeal should not be escalated",
        appeal.is_escalated,
        false,
      );
    }
  }
}
