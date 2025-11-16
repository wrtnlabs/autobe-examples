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
 * Test retrieval of saved content list when a member has no saved items.
 *
 * This scenario validates that the endpoint returns a properly formatted empty
 * paginated response. The test creates a new member account and immediately
 * queries their saved content collection without saving any content first.
 *
 * The response should be a valid paginated list structure with:
 *
 * - Empty data array
 * - Correct pagination metadata (total records = 0, total pages = 0)
 * - Proper pagination structure with current page and limit
 *
 * This ensures the endpoint handles the empty state gracefully.
 *
 * Steps:
 *
 * 1. Create a new member account through authentication
 * 2. Retrieve the saved content list for the newly created member
 * 3. Validate that the response is a properly formatted paginated response
 * 4. Verify that the data array is empty
 * 5. Verify that pagination metadata shows zero records and zero pages
 * 6. Verify that the pagination structure is correct
 */
export async function test_api_member_saved_content_list_empty(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  typia.assert(member.id);

  // Step 2: Retrieve the saved content list for the newly created member
  const requestData = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformSavedContent.IRequest;

  const savedContentPage =
    await api.functional.communityPlatform.member.members.saved.index(
      connection,
      {
        memberId: member.id,
        body: requestData,
      },
    );
  typia.assert(savedContentPage);

  // Step 3: Validate that the response is a properly formatted paginated response
  TestValidator.predicate(
    "saved content page has pagination property",
    savedContentPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "saved content page has data array property",
    Array.isArray(savedContentPage.data),
  );

  // Step 4: Verify that the data array is empty
  TestValidator.equals(
    "saved content data array should be empty",
    savedContentPage.data.length,
    0,
  );

  // Step 5: Verify that pagination metadata shows zero records and zero pages
  TestValidator.equals(
    "pagination records should be zero",
    savedContentPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    savedContentPage.pagination.pages,
    0,
  );

  // Step 6: Verify that the pagination structure is correct
  TestValidator.equals(
    "pagination current page should be 1",
    savedContentPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    savedContentPage.pagination.limit,
    10,
  );
}
