import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test navigating through multiple pages of moderation logs.
 *
 * This test validates the complete pagination workflow including first page,
 * middle pages, and last page retrieval. The moderator authenticates and
 * sequentially requests different pages (page=1, page=2, etc.) with a
 * consistent limit parameter.
 *
 * The test verifies that:
 *
 * 1. Pagination metadata accurately reflects the current page number
 * 2. Total records and total pages are correctly calculated
 * 3. Different result sets are returned for each page number
 * 4. The limit parameter is respected across all pages
 *
 * This enables efficient navigation through extensive moderation histories.
 */
export async function test_api_moderation_logs_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Define pagination parameters
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  // Step 3: Request first page of moderation logs
  const page1Request = {
    page: 1,
    limit: limit,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const page1Result: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: page1Request,
      },
    );
  typia.assert(page1Result);

  // Step 4: Validate first page pagination metadata
  TestValidator.equals(
    "first page current number should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches request",
    page1Result.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first page has valid total records",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page has valid total pages",
    page1Result.pagination.pages >= 0,
  );

  // Step 5: If there are multiple pages, request second page
  if (page1Result.pagination.pages > 1) {
    const page2Request = {
      page: 2,
      limit: limit,
    } satisfies IDiscussionBoardModerationLog.IRequest;

    const page2Result: IPageIDiscussionBoardModerationLog.ISummary =
      await api.functional.discussionBoard.moderator.moderationLogs.index(
        connection,
        {
          body: page2Request,
        },
      );
    typia.assert(page2Result);

    // Step 6: Validate second page pagination metadata
    TestValidator.equals(
      "second page current number should be 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit matches request",
      page2Result.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "second page total records matches first page",
      page2Result.pagination.records,
      page1Result.pagination.records,
    );
    TestValidator.equals(
      "second page total pages matches first page",
      page2Result.pagination.pages,
      page1Result.pagination.pages,
    );
  }

  // Step 7: Request third page if available
  if (page1Result.pagination.pages > 2) {
    const page3Request = {
      page: 3,
      limit: limit,
    } satisfies IDiscussionBoardModerationLog.IRequest;

    const page3Result: IPageIDiscussionBoardModerationLog.ISummary =
      await api.functional.discussionBoard.moderator.moderationLogs.index(
        connection,
        {
          body: page3Request,
        },
      );
    typia.assert(page3Result);

    // Step 8: Validate third page pagination metadata
    TestValidator.equals(
      "third page current number should be 3",
      page3Result.pagination.current,
      3,
    );
    TestValidator.equals(
      "third page total records consistent",
      page3Result.pagination.records,
      page1Result.pagination.records,
    );
    TestValidator.equals(
      "third page total pages consistent",
      page3Result.pagination.pages,
      page1Result.pagination.pages,
    );
  }
}
