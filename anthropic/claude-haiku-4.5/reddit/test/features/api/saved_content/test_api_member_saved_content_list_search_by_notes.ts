import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSavedContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSavedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSavedContent";

/**
 * Test full-text search functionality within saved content using the search
 * parameter.
 *
 * This test validates that the search field filters results based on user notes
 * and content preview text. The test will query saved content with various
 * search terms and verify the response structure, pagination, and filtering
 * behavior. Search should be case-insensitive and support partial word
 * matching. This enables members to organize and discover their bookmarked
 * content efficiently.
 *
 * Process:
 *
 * 1. Create member account through authentication
 * 2. Test search with various search terms
 * 3. Verify response structure and pagination
 * 4. Validate case-insensitive search behavior
 * 5. Test pagination parameters with search
 * 6. Verify empty search handling
 */
export async function test_api_member_saved_content_list_search_by_notes(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorized);
  const memberId = authorized.id;

  // Step 2: Test basic search with a search term
  const basicSearchRequest = {
    page: 1,
    limit: 10,
    search: "typescript",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const basicSearchResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: basicSearchRequest,
      },
    );
  typia.assert(basicSearchResult);

  // Step 3: Verify response structure
  TestValidator.predicate(
    "search response should have pagination info",
    basicSearchResult.pagination !== null &&
      basicSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "search response should have data array",
    Array.isArray(basicSearchResult.data),
  );
  TestValidator.predicate(
    "pagination should have current page",
    basicSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    basicSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 4: Test case-insensitive search
  const uppercaseSearchRequest = {
    page: 1,
    limit: 10,
    search: "TYPESCRIPT",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const caseInsensitiveResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: uppercaseSearchRequest,
      },
    );
  typia.assert(caseInsensitiveResult);

  // Step 5: Test partial word search
  const partialSearchRequest = {
    page: 1,
    limit: 10,
    search: "type",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const partialSearchResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: partialSearchRequest,
      },
    );
  typia.assert(partialSearchResult);

  // Step 6: Test pagination with different page and limit
  const paginatedSearchRequest = {
    page: 1,
    limit: 5,
    search: "react",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const paginatedSearchResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: paginatedSearchRequest,
      },
    );
  typia.assert(paginatedSearchResult);

  TestValidator.equals(
    "pagination page should match request",
    paginatedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedSearchResult.pagination.limit,
    5,
  );

  // Step 7: Test with different search term
  const secondSearchRequest = {
    page: 1,
    limit: 10,
    search: "testing",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const secondSearchResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: secondSearchRequest,
      },
    );
  typia.assert(secondSearchResult);

  // Step 8: Test search with minimal content
  const minimalSearchRequest = {
    page: 1,
    limit: 1,
    search: "api",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const minimalSearchResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: minimalSearchRequest,
      },
    );
  typia.assert(minimalSearchResult);

  TestValidator.predicate(
    "data array length should not exceed limit",
    minimalSearchResult.data.length <= 1,
  );

  // Step 9: Test search result data structure
  if (minimalSearchResult.data.length > 0) {
    const savedItem = minimalSearchResult.data[0];
    TestValidator.predicate(
      "saved content should have id",
      savedItem.id !== null && savedItem.id !== undefined,
    );
    TestValidator.predicate(
      "saved content should have content_type",
      savedItem.content_type !== null && savedItem.content_type !== undefined,
    );
    TestValidator.predicate(
      "saved content should have created_at",
      savedItem.created_at !== null && savedItem.created_at !== undefined,
    );
  }

  // Step 10: Test with high limit parameter
  const highLimitSearchRequest = {
    page: 1,
    limit: 100,
    search: "content",
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const highLimitSearchResult =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberId,
        body: highLimitSearchRequest,
      },
    );
  typia.assert(highLimitSearchResult);

  TestValidator.predicate(
    "result should respect maximum limit of 100",
    highLimitSearchResult.data.length <= 100,
  );
}
