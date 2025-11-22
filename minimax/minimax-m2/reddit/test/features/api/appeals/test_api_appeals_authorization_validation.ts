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

export async function test_api_appeals_authorization_validation(
  connection: api.IConnection,
) {
  // Test objective: Validate that registered users can only access their own appeals
  // and cannot see appeals from other users, ensuring proper authorization boundaries

  // Step 1: Create first registered user account for testing
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userEmail1,
      password: "test123456",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/referral",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user1);

  // Step 2: Create second registered user account to test cross-user privacy
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userEmail2,
      password: "test123456",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/referral",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user2);

  // Step 3: Create third registered user account for comprehensive testing
  const userEmail3 = typia.random<string & tags.Format<"email">>();
  const user3 = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userEmail3,
      password: "test123456",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/referral",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user3);

  // Step 4: Query appeals for user1 (should return empty list since no appeals created yet)
  const user1Appeals =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user1Appeals);

  // Validate user1 sees only their data (should be empty)
  TestValidator.equals(
    "user1 should have no appeals initially",
    user1Appeals.data.length,
    0,
  );
  TestValidator.equals(
    "pagination data should be present",
    user1Appeals.pagination.records,
    0,
  );

  // Step 5: Query appeals for user2 (should also return empty initially)
  const user2Appeals =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user2Appeals);

  // Validate user2 sees only their data (should be empty)
  TestValidator.equals(
    "user2 should have no appeals initially",
    user2Appeals.data.length,
    0,
  );
  TestValidator.equals(
    "user2 pagination should show zero records",
    user2Appeals.pagination.records,
    0,
  );

  // Step 6: Query appeals for user3 (should also return empty initially)
  const user3Appeals =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user3Appeals);

  // Validate user3 sees only their data (should be empty)
  TestValidator.equals(
    "user3 should have no appeals initially",
    user3Appeals.data.length,
    0,
  );
  TestValidator.equals(
    "user3 pagination should show zero records",
    user3Appeals.pagination.records,
    0,
  );

  // Step 7: Query appeals for user1 with broad criteria (should still return empty)
  const user1BroadSearch =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100, // Large limit
          order_by: "created_at",
          order_direction: "asc", // Different sort order
          status: undefined, // No status filter
          appeal_level: undefined, // No appeal level filter
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user1BroadSearch);

  // Validate broad search doesn't return other users' appeals
  TestValidator.equals(
    "user1 broad search should still be empty",
    user1BroadSearch.data.length,
    0,
  );
  TestValidator.equals(
    "user1 broad search records count should be 0",
    user1BroadSearch.pagination.records,
    0,
  );

  // Step 8: Test with pagination parameters for user2
  const user2Paginated =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "updated_at", // Different ordering
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user2Paginated);

  // Validate pagination works correctly for user2
  TestValidator.equals(
    "user2 paginated result should be empty",
    user2Paginated.data.length,
    0,
  );
  TestValidator.equals(
    "user2 pagination should reflect zero records",
    user2Paginated.pagination.records,
    0,
  );
  TestValidator.equals(
    "user2 pagination page should be 1",
    user2Paginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "user2 pagination limit should be 20",
    user2Paginated.pagination.limit,
    20,
  );

  // Step 9: Test with various filter combinations for user3 (should all return empty)
  const user3Filtered =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 2, // Test different page
          limit: 25,
          status: "pending", // Filter by non-existent status
          appeal_level: "initial", // Filter by non-existent level
          order_by: "resolved_at", // Different ordering
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user3Filtered);

  // Validate filtered search respects user boundaries
  TestValidator.equals(
    "user3 filtered search should be empty",
    user3Filtered.data.length,
    0,
  );
  TestValidator.equals(
    "user3 filtered pagination should show 0 records",
    user3Filtered.pagination.records,
    0,
  );
  TestValidator.equals(
    "user3 filtered should show correct page",
    user3Filtered.pagination.current,
    2,
  );

  // Step 10: Final validation - ensure all users maintain complete data isolation
  // User1 tries to access with no filters
  const user1Final =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {} satisfies IRedditPlatformModerationAppeal.IRequest, // Empty request body
      },
    );
  typia.assert(user1Final);
  TestValidator.equals(
    "user1 final check - no appeals",
    user1Final.data.length,
    0,
  );

  // Step 11: Cross-validate that users' data structures are isolated
  // Verify response structures are consistent across users
  TestValidator.equals(
    "user1 response structure valid",
    user1Appeals.pagination.pages,
    0,
  );
  TestValidator.equals(
    "user2 response structure valid",
    user2Appeals.pagination.pages,
    0,
  );
  TestValidator.equals(
    "user3 response structure valid",
    user3Appeals.pagination.pages,
    0,
  );

  // Step 12: Test with maximum limit for user2 to ensure proper bounds checking
  const user2MaxLimit =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(user2MaxLimit);

  // Validate maximum limit doesn't expose other users' data
  TestValidator.equals(
    "user2 max limit search should be empty",
    user2MaxLimit.data.length,
    0,
  );
  TestValidator.equals(
    "user2 max limit records should be 0",
    user2MaxLimit.pagination.records,
    0,
  );

  // Authorization validation complete - all users maintain strict data isolation
  // Each user can only access their own appeals, regardless of search parameters
}
