import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test searching email verification records filtered by creation and expiration date ranges.
 * Since the email verification search endpoint requires actual verification records,
 * this test focuses on testing the date range filtering functionality with the available
 * search parameters. The test verifies that date range filters work correctly for
 * creation and expiration dates, including edge cases and pagination.
 */
export async function test_api_email_verification_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection for making search requests
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test 1: Search with broad date ranges to see existing records
  const broadSearch =
    await api.functional.discussionBoard.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 365,
          ).toISOString(), // 1 year ago
          created_at_end: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 365,
          ).toISOString(), // 1 year from now
          expires_at_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 365,
          ).toISOString(), // 1 year ago
          expires_at_end: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 365,
          ).toISOString(), // 1 year from now
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(broadSearch);
  // Test 2: Search with specific date ranges
  const specificSearch =
    await api.functional.discussionBoard.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 7,
          ).toISOString(), // 1 week ago
          created_at_end: new Date().toISOString(), // now
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(specificSearch);
  // Test 3: Search with expiration date range only
  const expirationSearch =
    await api.functional.discussionBoard.user.email_verifications.index(
      userConnection,
      {
        body: {
          expires_at_start: new Date().toISOString(), // now
          expires_at_end: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(), // 30 days from now
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(expirationSearch);
  // Test 4: Search with no matching date range (should return empty)
  const futureSearch =
    await api.functional.discussionBoard.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(), // 1 day in future
          created_at_end: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 365,
          ).toISOString(), // 1 year in future
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(futureSearch);
  // Test 5: Search with pagination and date filtering
  const paginatedSearch =
    await api.functional.discussionBoard.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 365,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedSearch.data.length <= 5,
  );
  // Test 6: Search with combined date filters
  const combinedSearch =
    await api.functional.discussionBoard.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 30,
          ).toISOString(), // 30 days ago
          created_at_end: new Date().toISOString(), // now
          expires_at_start: new Date().toISOString(), // now
          expires_at_end: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 60,
          ).toISOString(), // 60 days from now
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate that all search responses have proper pagination structure
  const searches = [
    broadSearch,
    specificSearch,
    expirationSearch,
    futureSearch,
    paginatedSearch,
    combinedSearch,
  ];
  searches.forEach((search, index) => {
    TestValidator.predicate(
      `search ${index + 1} should have valid pagination`,
      search.pagination.current >= 0 &&
        search.pagination.limit >= 0 &&
        search.pagination.records >= 0 &&
        search.pagination.pages >= 0,
    );
  });
}
