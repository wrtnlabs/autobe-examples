import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentViolationRecord";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentViolationRecord";

/**
 * Test retrieving violation records with custom page limit.
 *
 * This test validates that moderators can retrieve violation records with
 * custom pagination limits. It authenticates a moderator and requests
 * violations with a custom limit of 50 records per page. The response validates
 * that the pagination respects the requested limit and returns accurate
 * pagination metadata.
 *
 * Test steps:
 *
 * 1. Moderator registers and authenticates
 * 2. Request violations with custom limit=50 on page=1
 * 3. Validate returned items count does not exceed 50
 * 4. Confirm pagination.limit equals 50
 * 5. Verify pagination.pages calculation is correct
 * 6. Ensure pagination metadata is accurate
 */
export async function test_api_violations_pagination_custom_limit(
  connection: api.IConnection,
) {
  // 1. Moderator authenticates
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        RandomGenerator.alphabets(8) +
        RandomGenerator.pick([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]) +
        RandomGenerator.pick([..."0123456789"]) +
        RandomGenerator.pick([..."!@#$%^&*"]),
      username: RandomGenerator.alphabets(10).substring(0, 10).toLowerCase(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Request violations with custom limit=50 on page=1
  const violationPage =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationPage);

  // 3. Validate returned items count does not exceed 50
  TestValidator.predicate(
    "returned items count should not exceed limit",
    violationPage.data.length <= 50,
  );

  // 4. Confirm pagination.limit equals 50
  TestValidator.equals(
    "pagination limit should equal requested limit",
    violationPage.pagination.limit,
    50,
  );

  // 5. Verify pagination.pages calculation is correct
  const expectedPages = Math.ceil(
    violationPage.pagination.records / violationPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages should be correctly calculated",
    violationPage.pagination.pages,
    expectedPages,
  );

  // 6. Ensure pagination metadata is accurate
  TestValidator.equals(
    "pagination current page should be 1",
    violationPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    violationPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data array length should match or be less than records",
    violationPage.data.length <= violationPage.pagination.records,
  );
}
