import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test retrieving guest visitor records with basic pagination functionality.
 *
 * This test validates the guest analytics retrieval endpoint for moderators,
 * ensuring proper pagination behavior, metadata accuracy, and data structure
 * compliance. The test covers default pagination, custom page sizes, page
 * navigation, boundary conditions, and response validation.
 *
 * Test Workflow:
 *
 * 1. Create and authenticate moderator account
 * 2. Test default pagination behavior
 * 3. Test custom page sizes within valid range
 * 4. Test page navigation and edge cases
 * 5. Validate pagination metadata consistency
 * 6. Verify guest summary data structure
 */
export async function test_api_guest_analytics_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: typia.random<
        string & tags.MinLength<3> & tags.MaxLength<20>
      >() satisfies string as string,
      display_name: RandomGenerator.name(),
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Retrieve guest analytics with default pagination
  const defaultRequest = {} satisfies IDiscussionBoardGuest.IRequest;
  const defaultResponse =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    defaultResponse.pagination !== null &&
      defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );

  // Validate data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResponse.data),
  );

  // If there are guest records, validate their structure
  if (defaultResponse.data.length > 0) {
    const firstGuest = defaultResponse.data[0];
    typia.assert(firstGuest);

    TestValidator.predicate(
      "guest has valid UUID",
      typeof firstGuest.id === "string" && firstGuest.id.length > 0,
    );
    TestValidator.predicate(
      "guest has session identifier",
      typeof firstGuest.session_identifier === "string" &&
        firstGuest.session_identifier.length > 0,
    );
    TestValidator.predicate(
      "guest has page_views as non-negative integer",
      typeof firstGuest.page_views === "number" && firstGuest.page_views >= 0,
    );
  }

  // Step 3: Test with custom page size
  const customLimitRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardGuest.IRequest;

  const customLimitResponse =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: customLimitRequest,
    });
  typia.assert(customLimitResponse);

  TestValidator.predicate(
    "custom limit is respected in response",
    customLimitResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    customLimitResponse.data.length <= 10,
  );

  // Step 4: Test with maximum allowed limit (100)
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardGuest.IRequest;

  const maxLimitResponse =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: maxLimitRequest,
    });
  typia.assert(maxLimitResponse);

  TestValidator.predicate(
    "maximum limit is respected",
    maxLimitResponse.pagination.limit === 100,
  );
  TestValidator.predicate(
    "data array length does not exceed maximum limit",
    maxLimitResponse.data.length <= 100,
  );

  // Step 5: Test with minimum pagination values
  const minPaginationRequest = {
    page: 1,
    limit: 1,
  } satisfies IDiscussionBoardGuest.IRequest;

  const minPaginationResponse =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: minPaginationRequest,
    });
  typia.assert(minPaginationResponse);

  TestValidator.predicate(
    "minimum limit works correctly",
    minPaginationResponse.pagination.limit === 1,
  );
  TestValidator.predicate(
    "data array respects minimum limit",
    minPaginationResponse.data.length <= 1,
  );

  // Step 6: Test pagination metadata consistency
  if (defaultResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      defaultResponse.pagination.pages,
      expectedPages,
    );
  }

  // Step 7: Test requesting page beyond available data (edge case)
  const beyondPageRequest = {
    page: 99999,
    limit: 10,
  } satisfies IDiscussionBoardGuest.IRequest;

  const beyondPageResponse =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: beyondPageRequest,
    });
  typia.assert(beyondPageResponse);

  TestValidator.predicate(
    "requesting page beyond data returns empty or valid response",
    Array.isArray(beyondPageResponse.data),
  );

  // Step 8: Test with different page numbers
  const page2Request = {
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardGuest.IRequest;

  const page2Response =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: page2Request,
    });
  typia.assert(page2Response);

  TestValidator.predicate(
    "page 2 navigation works correctly",
    page2Response.pagination.current === 2 ||
      page2Response.pagination.current === 0,
  );
}
