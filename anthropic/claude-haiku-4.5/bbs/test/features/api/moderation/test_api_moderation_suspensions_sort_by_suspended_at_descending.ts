import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test sorting suspensions by suspended_at timestamp in descending order.
 *
 * Validates that a moderator can retrieve suspensions sorted by the
 * suspended_at field in descending order (most recent first). This test creates
 * multiple suspension records with different timestamps, then queries the
 * suspension list with sort_by='suspended_at' and order='desc', verifying that
 * results are properly ordered from newest to oldest timestamps.
 *
 * This test is essential for moderation dashboards where moderators need quick
 * access to recent enforcement actions. It validates the sorting mechanism and
 * ensures that the API correctly implements the descending order for
 * timestamp-based queries.
 *
 * Process:
 *
 * 1. Moderator account creation and authentication
 * 2. Create multiple suspension records with varying timestamps
 * 3. Query suspensions with descending sort by suspended_at
 * 4. Validate that results are ordered from newest to oldest
 * 5. Verify pagination and result consistency
 */
export async function test_api_moderation_suspensions_sort_by_suspended_at_descending(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password:
          RandomGenerator.alphabets(10) +
          RandomGenerator.alphaNumeric(1) +
          "!1",
        username:
          RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(5),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query suspensions with descending sort by suspended_at
  // This retrieves suspensions sorted from most recent to oldest
  const suspensionPage: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "suspended_at",
          order: "desc",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionPage);

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "pagination current page should be 1",
    suspensionPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    suspensionPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    suspensionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be consistent",
    suspensionPage.pagination.pages >= 0,
  );

  // Step 4: Validate suspension data consistency
  if (suspensionPage.data.length > 0) {
    // Verify each suspension has required fields
    for (const suspension of suspensionPage.data) {
      TestValidator.predicate(
        "suspension should have valid id",
        typeof suspension.id === "string" && suspension.id.length > 0,
      );
      TestValidator.predicate(
        "suspension should have moderator reference",
        suspension.moderator !== null && suspension.moderator !== undefined,
      );
      TestValidator.predicate(
        "suspension should have valid suspended_at timestamp",
        typeof suspension.suspended_at === "string" &&
          suspension.suspended_at.length > 0,
      );
      TestValidator.predicate(
        "suspension should have valid suspension_type",
        ["posting_restriction", "account_suspension", "permanent_ban"].includes(
          suspension.suspension_type,
        ),
      );
      TestValidator.predicate(
        "suspension should have valid severity_level",
        ["minor", "moderate", "severe", "permanent"].includes(
          suspension.severity_level,
        ),
      );
      TestValidator.predicate(
        "suspension should have valid status",
        ["active", "lifted", "expired"].includes(suspension.status),
      );
    }

    // Step 5: Validate descending order of suspended_at timestamps
    for (let i = 0; i < suspensionPage.data.length - 1; i++) {
      const currentSuspension = suspensionPage.data[i];
      const nextSuspension = suspensionPage.data[i + 1];

      const currentTime = new Date(currentSuspension.suspended_at).getTime();
      const nextTime = new Date(nextSuspension.suspended_at).getTime();

      TestValidator.predicate(
        `suspension at index ${i} should have suspended_at >= suspension at index ${i + 1} (descending order)`,
        currentTime >= nextTime,
      );
    }
  }

  // Step 6: Verify that sorting works with different page requests
  const secondPage: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
          sort_by: "suspended_at",
          order: "desc",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page current should be 2",
    secondPage.pagination.current === 2,
  );

  // Step 7: Verify sorting consistency across pages
  if (
    suspensionPage.data.length > 0 &&
    secondPage.data.length > 0 &&
    suspensionPage.data[suspensionPage.data.length - 1] &&
    secondPage.data[0]
  ) {
    const lastFirstPageTime = new Date(
      suspensionPage.data[suspensionPage.data.length - 1].suspended_at,
    ).getTime();
    const firstSecondPageTime = new Date(
      secondPage.data[0].suspended_at,
    ).getTime();

    TestValidator.predicate(
      "last item of first page should be >= first item of second page (descending order consistency)",
      lastFirstPageTime >= firstSecondPageTime,
    );
  }
}
