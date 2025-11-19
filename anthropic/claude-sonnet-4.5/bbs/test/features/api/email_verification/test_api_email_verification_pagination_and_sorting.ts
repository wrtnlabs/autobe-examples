import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEmailVerification";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardEmailVerification";

/**
 * Test email verification record pagination and sorting functionality.
 *
 * This test validates that moderators can efficiently navigate through email
 * verification records using pagination controls and customize the ordering of
 * results using various sort parameters. The test works with existing
 * verification records in the system.
 *
 * Steps:
 *
 * 1. Register moderator account for authentication
 * 2. Fetch all records to understand the dataset
 * 3. Test pagination with different page sizes and page numbers
 * 4. Test sorting by created_at (ascending and descending)
 * 5. Test sorting by expires_at (ascending and descending)
 * 6. Verify pagination metadata accuracy
 * 7. Validate correct record ordering
 */
export async function test_api_email_verification_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Fetch initial dataset to understand total records
  const initialFetch =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(initialFetch);

  // Step 3: Test pagination with limit=5, page=1
  const page1Limit5 =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "current page should be 1",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 5", page1Limit5.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 should have at most 5 records",
    page1Limit5.data.length <= 5,
  );

  // Step 4: Test pagination with limit=10, page=1
  const page1Limit10 =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals("limit should be 10", page1Limit10.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 with limit 10 should have at most 10 records",
    page1Limit10.data.length <= 10,
  );

  // Step 5: Test pagination page=2 if enough records exist
  if (initialFetch.pagination.pages >= 2) {
    const page2Limit5 =
      await api.functional.discussionBoard.moderator.emailVerifications.index(
        connection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardEmailVerification.IRequest,
        },
      );
    typia.assert(page2Limit5);
    TestValidator.equals(
      "current page should be 2",
      page2Limit5.pagination.current,
      2,
    );
  }

  // Step 6: Test sorting by created_at ascending
  const sortedAscCreated =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          limit: 20,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(sortedAscCreated);

  // Validate ascending order by created_at
  for (let i = 0; i < sortedAscCreated.data.length - 1; i++) {
    const current = new Date(sortedAscCreated.data[i].created_at).getTime();
    const next = new Date(sortedAscCreated.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `record ${i} created_at should be <= record ${i + 1} in ascending order`,
      current <= next,
    );
  }

  // Step 7: Test sorting by created_at descending
  const sortedDescCreated =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 20,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(sortedDescCreated);

  // Validate descending order by created_at
  for (let i = 0; i < sortedDescCreated.data.length - 1; i++) {
    const current = new Date(sortedDescCreated.data[i].created_at).getTime();
    const next = new Date(sortedDescCreated.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `record ${i} created_at should be >= record ${i + 1} in descending order`,
      current >= next,
    );
  }

  // Step 8: Test sorting by expires_at ascending
  const sortedAscExpires =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          order: "asc",
          limit: 20,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(sortedAscExpires);

  // Validate ascending order by expires_at
  for (let i = 0; i < sortedAscExpires.data.length - 1; i++) {
    const current = new Date(sortedAscExpires.data[i].expires_at).getTime();
    const next = new Date(sortedAscExpires.data[i + 1].expires_at).getTime();
    TestValidator.predicate(
      `record ${i} expires_at should be <= record ${i + 1} in ascending order`,
      current <= next,
    );
  }

  // Step 9: Test sorting by expires_at descending
  const sortedDescExpires =
    await api.functional.discussionBoard.moderator.emailVerifications.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          order: "desc",
          limit: 20,
        } satisfies IDiscussionBoardEmailVerification.IRequest,
      },
    );
  typia.assert(sortedDescExpires);

  // Validate descending order by expires_at
  for (let i = 0; i < sortedDescExpires.data.length - 1; i++) {
    const current = new Date(sortedDescExpires.data[i].expires_at).getTime();
    const next = new Date(sortedDescExpires.data[i + 1].expires_at).getTime();
    TestValidator.predicate(
      `record ${i} expires_at should be >= record ${i + 1} in descending order`,
      current >= next,
    );
  }

  // Step 10: Validate pagination metadata consistency
  TestValidator.equals(
    "total records should be consistent across calls",
    initialFetch.pagination.records,
    page1Limit5.pagination.records,
  );
  TestValidator.equals(
    "total records match between different queries",
    page1Limit5.pagination.records,
    sortedAscCreated.pagination.records,
  );
}
