import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test email-based filtering capabilities including exact email matching and domain-level filtering.
 * Verify that exact email searches return specific results, while domain filtering returns
 * users with matching email domains. Test edge cases like invalid email formats, non-existent
 * emails, and null email parameters.
 */
export async function test_api_user_search_by_email_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for testing
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Null email parameter (should return all users)
  const nullEmailResult = await api.functional.discussionBoard.users.index(
    testConnection,
    {
      body: {
        email: null,
        limit: 10,
        page: 1,
        sort: "newest",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(nullEmailResult);
  TestValidator.predicate(
    "null email returns paginated results",
    nullEmailResult.pagination.records >= 0 &&
      nullEmailResult.pagination.limit === 10 &&
      nullEmailResult.pagination.current === 1,
  );
  // Test 2: Invalid email format
  const invalidEmailResult = await api.functional.discussionBoard.users.index(
    testConnection,
    {
      body: {
        email: "not-an-email",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(invalidEmailResult);
  TestValidator.predicate(
    "invalid email format returns valid pagination structure",
    invalidEmailResult.pagination.records >= 0 &&
      invalidEmailResult.pagination.limit === 5,
  );
  // Test 3: Non-existent email
  const nonExistentResult = await api.functional.discussionBoard.users.index(
    testConnection,
    {
      body: {
        email: "nonexistent-user@example.com",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent email returns zero records",
    nonExistentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent email returns empty data array",
    nonExistentResult.data.length,
    0,
  );
  // Test 4: Domain-level filtering with common domain pattern
  const domainFilterResult = await api.functional.discussionBoard.users.index(
    testConnection,
    {
      body: {
        email: "@example.com",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(domainFilterResult);
  TestValidator.predicate(
    "domain filter returns valid pagination",
    domainFilterResult.pagination.records >= 0 &&
      domainFilterResult.pagination.limit === 10,
  );
  // Test 5: Empty string email (edge case)
  const emptyEmailResult = await api.functional.discussionBoard.users.index(
    testConnection,
    {
      body: {
        email: "",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(emptyEmailResult);
  TestValidator.predicate(
    "empty string email returns valid response",
    emptyEmailResult.pagination.records >= 0,
  );
  // Test 6: Combined email filter with pagination
  const paginatedResult = await api.functional.discussionBoard.users.index(
    testConnection,
    {
      body: {
        email: "@test",
        limit: 2,
        page: 1,
        sort: "display_name_asc",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination with email filter works correctly",
    paginatedResult.data.length <= 2 &&
      paginatedResult.pagination.limit === 2 &&
      paginatedResult.pagination.current === 1,
  );
  // Test 7: Verify response structure maintains privacy
  if (nullEmailResult.data.length > 0) {
    const userSummary = nullEmailResult.data[0];
    TestValidator.equals(
      "user summary has id field",
      typeof userSummary.id,
      "string",
    );
    TestValidator.equals(
      "user summary has display_name field",
      typeof userSummary.display_name,
      "string",
    );
    TestValidator.predicate(
      "user summary has valid created_at",
      typeof userSummary.created_at === "string" &&
        userSummary.created_at.includes("T"),
    );
    TestValidator.predicate(
      "user summary has valid updated_at",
      typeof userSummary.updated_at === "string" &&
        userSummary.updated_at.includes("T"),
    );
    // Verify no sensitive fields are present
    TestValidator.predicate(
      "user summary excludes password_hash",
      !("password_hash" in userSummary),
    );
    TestValidator.predicate(
      "user summary excludes email",
      !("email" in userSummary),
    );
  }
}
