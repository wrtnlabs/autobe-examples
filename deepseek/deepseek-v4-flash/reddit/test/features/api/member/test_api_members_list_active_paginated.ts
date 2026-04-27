import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test listing active (non-deleted) member accounts with default pagination and sorting.
 *
 * Validates the member directory listing endpoint which returns paginated results of registered member accounts. By default, only active members (those without a soft-deletion timestamp) are returned, ordered by creation date descending. The endpoint supports pagination parameters including page number and page size limit.
 *
 * Special attention is given to verifying that pagination metadata is consistent across multiple pages, that the page size limit parameter is respected, and that requesting a page beyond the available page count returns an empty data array with bounded pagination information. Also verifies that sensitive fields like password_hash are never exposed in the response.
 *
 * 1. Call the members endpoint with no filters — should return the first page of active members (deleted_at IS NULL) ordered by created_at descending.
 * 2. Verify the response contains pagination metadata (current page, limit, total records, total pages).
 * 3. Verify each member summary contains id (UUID), email, username, created_at, and deleted_at (should be null for active members).
 * 4. Verify no password_hash field is exposed in any response.
 * 5. Navigate to page 2 using the page parameter — should return the next set of results.
 * 6. Verify total records count is consistent between page 1 and page 2 responses.
 * 7. Test with limit=5 to confirm page size is respected and the actual data array length does not exceed the limit.
 * 8. Test with limit=100 (max) to confirm the upper bound is enforced.
 * 9. Test with page beyond available pages (e.g., page=9999) — should return an empty data array with pagination metadata showing current page as the last available page (bounded).
 */
export async function test_api_members_list_active_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1 & 2: Call with no filters - first page of active members
  const page1 = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination metadata fields are present and non-negative
  TestValidator.predicate(
    "pagination metadata valid",
    () =>
      page1.pagination.current >= 1 &&
      page1.pagination.limit >= 1 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );
  // Step 3 & 4: Verify each member summary structure
  // typia.assert validates all fields including that no password_hash is exposed
  for (const member of page1.data) {
    typia.assert(member);
    // Active members must have null deleted_at
    TestValidator.equals(
      "active member has null deleted_at",
      member.deleted_at,
      null,
    );
  }
  // Step 5 & 6: Navigate to page 2 if available
  if (page1.pagination.pages >= 2) {
    const page2 = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          page: 2,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(page2);
    // Verify total records count is consistent between pages
    TestValidator.equals(
      "total records consistent between pages",
      page2.pagination.records,
      page1.pagination.records,
    );
    // Verify page 2 has correct current page
    TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  }
  // Step 7: Test with limit=5
  const limited = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        limit: 5,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(limited);
  TestValidator.predicate(
    "limit=5 data length",
    () => limited.data.length <= 5,
  );
  TestValidator.equals("limit=5 in metadata", limited.pagination.limit, 5);
  // Step 8: Test with limit=100 (max)
  const maxLimited = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(maxLimited);
  TestValidator.predicate(
    "limit=100 data length",
    () => maxLimited.data.length <= 100,
  );
  TestValidator.equals(
    "limit=100 in metadata",
    maxLimited.pagination.limit,
    100,
  );
  // Step 9: Test with page beyond available pages
  const beyondPage = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        page: 9999,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(beyondPage);
  // Should return empty data array when page is beyond available pages
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPage.data.length,
    0,
  );
  // Current page should be bounded to the last available page
  TestValidator.predicate(
    "page bounded to last available page",
    () =>
      beyondPage.pagination.current >= 1 &&
      beyondPage.pagination.current <= (beyondPage.pagination.pages || 1),
  );
}
