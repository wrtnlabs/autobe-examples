import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserWarning";

/**
 * Test that warning search results are properly paginated and sortable to
 * enable efficient navigation of large warning datasets.
 *
 * This test validates the complete pagination and sorting workflow for warning
 * search functionality. The test creates multiple warnings with different
 * severities and issue dates, then retrieves them with various pagination and
 * sorting parameters to verify correct implementation.
 *
 * Workflow:
 *
 * 1. Create moderator account for issuing and searching warnings
 * 2. Create multiple member accounts to receive warnings
 * 3. Issue multiple warnings with varying severity levels and timestamps
 * 4. Test pagination with different page sizes and page numbers
 * 5. Validate pagination metadata accuracy
 * 6. Test sorting by issue date (ascending and descending)
 * 7. Test sorting by severity level
 * 8. Verify navigation between pages maintains filter state
 * 9. Confirm total warning count reflects actual warnings created
 */
export async function test_api_warning_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts to receive warnings
  const memberCount = 10;
  const members = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.discussionBoard.members.create(
      connection,
      {
        body: {
          username: `${RandomGenerator.name(1)}_${index}`,
          email: memberEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
    typia.assert(member);
    return member;
  });

  // Step 3: Create multiple warnings with varying severity levels
  const severityLevels = ["minor", "moderate", "severe"] as const;
  const warningReasons = [
    "spam",
    "harassment",
    "off-topic",
    "inappropriate language",
    "misinformation",
  ] as const;

  const totalWarnings = 25;
  const createdWarnings = await ArrayUtil.asyncRepeat(
    totalWarnings,
    async (index) => {
      const targetMember = RandomGenerator.pick(members);
      const severity = RandomGenerator.pick(severityLevels);
      const reason = RandomGenerator.pick(warningReasons);

      const warning =
        await api.functional.discussionBoard.moderator.moderation.warnings.create(
          connection,
          {
            body: {
              discussion_board_member_id: targetMember.id,
              warning_reason: reason,
              warning_details: RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 4,
                wordMax: 8,
              }),
              severity: severity,
            } satisfies IDiscussionBoardUserWarning.ICreate,
          },
        );
      typia.assert(warning);
      return warning;
    },
  );

  // Step 4: Test basic pagination - retrieve first page with default settings
  const firstPageResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(firstPageResult);

  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "total records should match created warnings",
    firstPageResult.pagination.records,
    totalWarnings,
  );
  TestValidator.equals(
    "first page current should be 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should be 10",
    firstPageResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages should be 3",
    firstPageResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "first page should have 10 items",
    firstPageResult.data.length,
    10,
  );

  // Step 6: Test second page retrieval
  const secondPageResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page current should be 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page should have 10 items",
    secondPageResult.data.length,
    10,
  );

  // Step 7: Test last page retrieval
  const lastPageResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(lastPageResult);

  TestValidator.equals(
    "last page should have 5 items",
    lastPageResult.data.length,
    5,
  );

  // Step 8: Verify no overlap between pages
  const firstPageIds = firstPageResult.data.map((w) => w.id);
  const secondPageIds = secondPageResult.data.map((w) => w.id);
  const lastPageIds = lastPageResult.data.map((w) => w.id);

  const allPageIds = [...firstPageIds, ...secondPageIds, ...lastPageIds];
  const uniqueIds = new Set(allPageIds);
  TestValidator.equals(
    "no duplicate warnings across pages",
    uniqueIds.size,
    allPageIds.length,
  );

  // Step 9: Test different page size
  const smallPageResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(smallPageResult);

  TestValidator.equals(
    "small page size limit should be 5",
    smallPageResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "small page should have 5 items",
    smallPageResult.data.length,
    5,
  );
  TestValidator.equals(
    "total pages with limit 5 should be 5",
    smallPageResult.pagination.pages,
    5,
  );

  // Step 10: Test sorting by created_at descending (newest first)
  const sortedNewestResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(sortedNewestResult);

  // Verify descending order
  for (let i = 0; i < sortedNewestResult.data.length - 1; i++) {
    const current = new Date(sortedNewestResult.data[i].created_at);
    const next = new Date(sortedNewestResult.data[i + 1].created_at);
    TestValidator.predicate(
      `warning ${i} should be newer than warning ${i + 1}`,
      current >= next,
    );
  }

  // Step 11: Test sorting by created_at ascending (oldest first)
  const sortedOldestResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(sortedOldestResult);

  // Verify ascending order
  for (let i = 0; i < sortedOldestResult.data.length - 1; i++) {
    const current = new Date(sortedOldestResult.data[i].created_at);
    const next = new Date(sortedOldestResult.data[i + 1].created_at);
    TestValidator.predicate(
      `warning ${i} should be older than warning ${i + 1}`,
      current <= next,
    );
  }

  // Step 12: Test sorting by severity
  const sortedBySeverityResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          sort_by: "severity",
          sort_order: "desc",
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(sortedBySeverityResult);

  TestValidator.equals(
    "sorted by severity should return all warnings",
    sortedBySeverityResult.data.length,
    totalWarnings,
  );

  // Step 13: Test filtering by specific severity level
  const severeWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          severity: "severe",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(severeWarningsResult);

  // Verify all returned warnings have severe severity
  for (const warning of severeWarningsResult.data) {
    TestValidator.equals(
      "filtered warning should have severe severity",
      warning.severity,
      "severe",
    );
  }

  // Step 14: Test filtering by moderator
  const moderatorWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_moderator_id: moderator.id,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(moderatorWarningsResult);

  TestValidator.equals(
    "all warnings should be issued by the moderator",
    moderatorWarningsResult.pagination.records,
    totalWarnings,
  );

  // Step 15: Test filtering by specific member
  const firstMember = members[0];
  const memberWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: firstMember.id,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(memberWarningsResult);

  // Verify all returned warnings are for the specific member
  for (const warning of memberWarningsResult.data) {
    TestValidator.equals(
      "filtered warning should be for the specific member",
      warning.discussion_board_member_id,
      firstMember.id,
    );
  }
}
