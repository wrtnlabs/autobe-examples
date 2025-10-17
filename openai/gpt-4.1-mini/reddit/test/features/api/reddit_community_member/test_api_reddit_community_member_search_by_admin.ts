import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * Test searching for reddit community members with filtering and pagination
 * capabilities by an admin user.
 *
 * 1. Authenticate as admin user with unique email and password.
 * 2. Use the obtained admin authentication token to perform filtered member
 *    searches.
 * 3. Filter members by email substring and email verification status (true,
 *    false).
 * 4. Verify that returned member data matches the filter criteria.
 * 5. Ensure pagination metadata is correct and present.
 * 6. Confirm only admins can perform the search; unauthorized access is prevented.
 */
export async function test_api_reddit_community_member_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  // Create a unique email for admin
  const adminEmail: string = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword: string = "AdminPass123!";

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Define member search filter by email substring and is_email_verified true
  const emailFilter = "example.com";
  const isEmailVerifiedFilter = true;
  const searchRequest1: IRedditCommunityMember.IRequest = {
    page: 1,
    limit: 10,
    email: emailFilter,
    is_email_verified: isEmailVerifiedFilter,
  };

  // 3. Perform member search filtered by email and email verification true
  const pageResult1: IPageIRedditCommunityMember.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityMembers.index(
      connection,
      { body: searchRequest1 },
    );
  typia.assert(pageResult1);

  // 4. Validate pagination metadata presence and correctness
  TestValidator.predicate(
    "pagination current page number is 1",
    pageResult1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pageResult1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageResult1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult1.pagination.records >= 0,
  );

  // 5. Validate each member item matches filter criteria
  for (const member of pageResult1.data) {
    typia.assert(member); // Validate member structure
    TestValidator.predicate(
      `member email contains filter ${emailFilter}`,
      member.email.includes(emailFilter),
    );
    TestValidator.equals(
      `member is_email_verified matches filter`,
      member.is_email_verified,
      isEmailVerifiedFilter,
    );
  }

  // 6. Now test search with filter is_email_verified false
  const isEmailVerifiedFilterFalse = false;
  const searchRequest2: IRedditCommunityMember.IRequest = {
    page: 1,
    limit: 5,
    is_email_verified: isEmailVerifiedFilterFalse,
  };

  const pageResult2: IPageIRedditCommunityMember.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityMembers.index(
      connection,
      { body: searchRequest2 },
    );
  typia.assert(pageResult2);

  // 7. Validate pagination info for second search
  TestValidator.predicate(
    "pagination current page number is 1 (second search)",
    pageResult2.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5 (second search)",
    pageResult2.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages is non-negative (second search)",
    pageResult2.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative (second search)",
    pageResult2.pagination.records >= 0,
  );

  // 8. Validate each member in second search matches is_email_verified false
  for (const member of pageResult2.data) {
    typia.assert(member);
    TestValidator.equals(
      `member is_email_verified matches filter false`,
      member.is_email_verified,
      isEmailVerifiedFilterFalse,
    );
  }

  // 9. Test access control: attempt to search members without admin auth
  // Create a new connection with empty headers (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Expect error when unauthenticated or non-admin tries
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.redditCommunity.admin.redditCommunityMembers.index(
      unauthenticatedConnection,
      { body: { page: 1, limit: 1 } satisfies IRedditCommunityMember.IRequest },
    );
  });
}
