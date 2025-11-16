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
 * Test pagination functionality when retrieving a member's saved content list.
 *
 * This test validates that pagination works correctly with various page numbers
 * and limit parameters. It verifies:
 *
 * 1. Member account creation and authentication
 * 2. Pagination metadata accuracy (current page, limit, total records, total
 *    pages)
 * 3. Result set size boundaries based on requested limit
 * 4. Correct offset calculations across different page numbers
 * 5. Edge cases and boundary conditions for pagination
 */
export async function test_api_member_saved_content_list_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    ip: "192.168.1.1",
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberResponse);
  TestValidator.predicate(
    "member should be created with valid authorization token",
    memberResponse.id !== null && memberResponse.token.access !== null,
  );

  // Step 2: Test pagination with page 1 and limit 10
  const page1Response: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberResponse.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(page1Response);

  TestValidator.equals(
    "first page should have page number 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match requested limit of 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    page1Response.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination metadata should have valid total records",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination metadata should have valid total pages",
    page1Response.pagination.pages >= 0,
  );

  // Step 3: Test pagination with different limit (limit 5)
  const smallLimitResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberResponse.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(smallLimitResponse);

  TestValidator.equals(
    "limit should be 5",
    smallLimitResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array with limit 5 should not exceed 5 items",
    smallLimitResponse.data.length <= 5,
  );

  // Step 4: Test pagination with larger limit (limit 50)
  const largeLimitResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberResponse.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(largeLimitResponse);

  TestValidator.equals(
    "limit should be 50",
    largeLimitResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "data array with limit 50 should not exceed 50 items",
    largeLimitResponse.data.length <= 50,
  );

  // Step 5: Test pagination with page 2
  if (page1Response.pagination.records > 10) {
    const page2Response: IPageICommunityPlatformSavedContent.ISummary =
      await api.functional.communityPlatform.member.members.saved.index(
        connection,
        {
          memberId: memberResponse.id,
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformSavedContent.IRequest,
        },
      );
    typia.assert(page2Response);

    TestValidator.equals(
      "second page should have page number 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "limit should still be 10",
      page2Response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "page 2 data should not exceed limit",
      page2Response.data.length <= 10,
    );
  }

  // Step 6: Verify pagination metadata consistency
  TestValidator.predicate(
    "total pages calculation should be consistent",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );

  // Step 7: Test with minimum limit (1)
  const minLimitResponse: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberResponse.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(minLimitResponse);

  TestValidator.equals(
    "minimum limit of 1 should be respected",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data with limit 1 should have at most 1 item",
    minLimitResponse.data.length <= 1,
  );

  // Step 8: Verify pagination is consistent across multiple requests
  const consistencyCheckPage1: IPageICommunityPlatformSavedContent.ISummary =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: memberResponse.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSavedContent.IRequest,
      },
    );
  typia.assert(consistencyCheckPage1);

  TestValidator.equals(
    "total records should be consistent across requests",
    page1Response.pagination.records,
    consistencyCheckPage1.pagination.records,
  );
  TestValidator.equals(
    "total pages should be consistent across requests",
    page1Response.pagination.pages,
    consistencyCheckPage1.pagination.pages,
  );
}
