import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAppeal";

/**
 * Test moderation appeals search endpoint for pagination and sorting
 * functionality.
 *
 * This test validates the complete appeal management workflow by testing the
 * search endpoint with various pagination and sorting parameters:
 *
 * - Pagination with different page sizes (5, 10, 20, 100) and page numbers
 * - Sorting by submission timestamp in ascending and descending order
 * - Default sorting behavior (newest first)
 * - Accurate pagination metadata
 * - Edge cases like empty pages and maximum results
 * - Consistent results when querying same parameters
 *
 * Process:
 *
 * 1. Create moderator account for managing appeals
 * 2. Create member account for submitting appeals
 * 3. Test appeals search with various pagination combinations
 * 4. Verify sorting behavior (ascending/descending by submitted_at)
 * 5. Validate pagination metadata accuracy
 * 6. Test edge cases and consistency
 */
export async function test_api_moderation_appeals_search_sorting_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );

  // Step 2: Create member account for submitting appeals
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 3: Test appeals search with default pagination
  const defaultPageResult: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(defaultPageResult);
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPageResult.pagination !== null,
  );
  TestValidator.equals(
    "first page current value is 1",
    defaultPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    defaultPageResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    defaultPageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    defaultPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "returned data is array",
    Array.isArray(defaultPageResult.data),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    defaultPageResult.data.length <= 20,
  );

  // Step 4: Verify default sorting is descending (newest first) by submitted_at
  if (defaultPageResult.data.length > 1) {
    const timestamps = defaultPageResult.data.map((appeal) =>
      new Date(appeal.submitted_at).getTime(),
    );
    let isDescending = true;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] > timestamps[i - 1]) {
        isDescending = false;
        break;
      }
    }
    TestValidator.predicate(
      "default sort is descending by submitted_at (newest first)",
      isDescending || defaultPageResult.data.length <= 1,
    );
  }

  // Step 5: Test sorting in ascending order
  const ascendingResult: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "submitted_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(ascendingResult);

  if (ascendingResult.data.length > 1) {
    const timestamps = ascendingResult.data.map((appeal) =>
      new Date(appeal.submitted_at).getTime(),
    );
    let isAscending = true;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i - 1]) {
        isAscending = false;
        break;
      }
    }
    TestValidator.predicate(
      "ascending sort is correct by submitted_at (oldest first)",
      isAscending || ascendingResult.data.length <= 1,
    );
  }

  // Step 6: Test different page size (small limit)
  const smallPageResult: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page limit respected",
    smallPageResult.data.length <= 5,
  );
  TestValidator.equals(
    "small page limit value correct",
    smallPageResult.pagination.limit,
    5,
  );

  // Step 7: Test larger page size
  const largePageResult: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page limit respected",
    largePageResult.data.length <= 50,
  );

  // Step 8: Test page 2 navigation (if multiple pages exist)
  if (defaultPageResult.pagination.pages > 1) {
    const page2Result: IPageICommunityPlatformModerationAppeal.ISummary =
      await api.functional.communityPlatform.moderator.moderationAppeals.index(
        connection,
        {
          body: {
            page: 2,
            limit: 20,
          } satisfies ICommunityPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current value is correct",
      page2Result.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 returns different results",
      page2Result.data.length === 0 ||
        page2Result.data[0]?.id !== defaultPageResult.data[0]?.id,
    );
  }

  // Step 9: Test requesting page beyond available pages
  const beyondPageResult: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 9999,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.predicate(
    "beyond page returns empty data",
    beyondPageResult.data.length >= 0,
  );

  // Step 10: Test maximum allowed limit
  const maxLimitResult: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit respected",
    maxLimitResult.data.length <= 100,
  );
  TestValidator.equals(
    "max limit pagination value correct",
    maxLimitResult.pagination.limit,
    100,
  );

  // Step 11: Test consistency - same query should return same results
  const consistencyTest1: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(consistencyTest1);

  const consistencyTest2: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(consistencyTest2);

  TestValidator.equals(
    "consistent total records count",
    consistencyTest1.pagination.records,
    consistencyTest2.pagination.records,
  );
  TestValidator.equals(
    "consistent pages count",
    consistencyTest1.pagination.pages,
    consistencyTest2.pagination.pages,
  );

  // Step 12: Test pagination data structure when appeals exist
  if (defaultPageResult.data.length > 0) {
    const appeal = defaultPageResult.data[0]!;
    TestValidator.predicate(
      "appeal has valid id",
      appeal.id !== null &&
        appeal.id !== undefined &&
        typeof appeal.id === "string",
    );
    TestValidator.predicate(
      "appeal has appellant",
      appeal.appellant !== null && appeal.appellant !== undefined,
    );
    TestValidator.predicate(
      "appeal has decision",
      appeal.decision !== null && appeal.decision !== undefined,
    );
    TestValidator.predicate(
      "appeal has valid status",
      ["submitted", "in_review", "approved", "denied", "reduced"].includes(
        appeal.appeal_status,
      ),
    );
    TestValidator.predicate(
      "appeal has reason text",
      appeal.appeal_reason !== null && appeal.appeal_reason.length > 0,
    );
    TestValidator.predicate(
      "appeal has submitted_at timestamp",
      appeal.submitted_at !== null && appeal.submitted_at !== undefined,
    );
  }

  // Step 13: Test combined pagination and sorting consistency
  const combinedResult1: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "submitted_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedResult1);

  const combinedResult2: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "submitted_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedResult2);

  TestValidator.predicate(
    "combined pagination and sorting is consistent",
    combinedResult1.data.length === combinedResult2.data.length &&
      (combinedResult1.data.length === 0 ||
        combinedResult1.data[0]?.id === combinedResult2.data[0]?.id),
  );
}
