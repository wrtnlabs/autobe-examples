import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Comprehensive E2E test for post search pagination functionality.
 *
 * This test validates that the discussion board post search properly handles
 * pagination parameters including page numbers, result limits, and calculates
 * correct pagination metadata. The test covers authentication setup, parameter
 * validation, and result integrity verification to ensure the pagination system
 * works correctly across different scenarios.
 */
export async function test_api_member_post_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://example.com/test",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Authenticate the member to establish proper session
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/test",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 2: Test default pagination with proper type constraints
  const defaultResults =
    await api.functional.discussionBoard.member.posts.index(connection, {
      body: {
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(defaultResults);

  // Validate pagination structure
  TestValidator.equals(
    "pagination should have current page",
    defaultResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    defaultResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultResults.pagination.pages >= 0,
  );

  // Step 3: Test different page numbers
  const pageNumbers = [1, 2, 3] as const;
  for (const page of pageNumbers) {
    const pageResults = await api.functional.discussionBoard.member.posts.index(
      connection,
      {
        body: {
          page: page,
          limit: 10,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
    typia.assert(pageResults);

    TestValidator.equals(
      "current page should match request",
      pageResults.pagination.current,
      page,
    );
    TestValidator.equals(
      "limit should be consistent",
      pageResults.pagination.limit,
      10,
    );
  }

  // Step 4: Test different limit values within valid range
  const limitValues = [5, 20, 50] as const;
  for (const limit of limitValues) {
    const limitResults =
      await api.functional.discussionBoard.member.posts.index(connection, {
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardPost.IRequest,
      });
    typia.assert(limitResults);

    TestValidator.equals(
      "limit should match request",
      limitResults.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "current page should be 1",
      limitResults.pagination.current === 1,
    );
  }

  // Step 5: Test pagination calculations with specific values
  const calculationResults =
    await api.functional.discussionBoard.member.posts.index(connection, {
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardPost.IRequest,
    });
  typia.assert(calculationResults);

  // Validate pagination calculation logic
  if (calculationResults.pagination.records > 0) {
    const expectedPages = Math.ceil(
      calculationResults.pagination.records /
        calculationResults.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation should be correct",
      calculationResults.pagination.pages,
      expectedPages,
    );
  } else {
    // Handle empty result set scenario
    TestValidator.equals(
      "empty result set should have 0 or 1 pages",
      calculationResults.pagination.pages,
      0,
    );
  }

  // Step 6: Test data structure integrity with proper empty case handling
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(defaultResults.data),
  );

  // Validate individual post summary structure if data exists
  if (defaultResults.data.length > 0) {
    const samplePost = defaultResults.data[0];
    TestValidator.predicate(
      "post should have ID",
      typeof samplePost.id === "string",
    );
    TestValidator.predicate(
      "post should have type",
      typeof samplePost.type === "string",
    );
    TestValidator.predicate(
      "post should have title",
      typeof samplePost.title === "string",
    );
  }
}
