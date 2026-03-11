import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member search combining display name filtering with account status filtering.
 *
 * Create member accounts with various display names and ban statuses.
 * Use the search endpoint to filter by display name partial matching combined with
 * banned status filtering. Validate that the search correctly returns only accounts
 * matching both criteria. Test different combinations of display name patterns and
 * status filters to ensure comprehensive filtering functionality.
 */
export async function test_api_member_search_by_display_name_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for administrative operations
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create member accounts with various display name patterns
  const createMember = async (
    displayName: string,
  ): Promise<IDiscussionBoardMember.IAuthorized> => {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: displayName,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(member);
    return member;
  };
  // Create test members
  const testUser1 = await createMember("TestUser1");
  const testUser2 = await createMember("TestUser2");
  const testUser3 = await createMember("TestUser3");
  const bannedUser1 = await createMember("BannedUser1");
  const bannedUser2 = await createMember("BannedUser2");
  const adminUser = await createMember("AdminUser");
  // 3. Prepare search request function
  const searchMembers = async (
    request: IDiscussionBoardMember.IRequest,
  ): Promise<IPageIDiscussionBoardMember.ISummary> => {
    const result = await api.functional.discussionBoard.members.index(
      adminConnection,
      {
        body: request,
      },
    );
    typia.assert(result);
    return result;
  };
  // 4. Test 1: Search by display_name partial match "Test"
  const search1 = await searchMembers({
    display_name: "Test",
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find exactly 3 members with 'Test' in display name",
    search1.data.length,
    3,
  );
  const foundTestIds = new Set(search1.data.map((member) => member.id));
  TestValidator.predicate(
    "should include TestUser1",
    foundTestIds.has(testUser1.id),
  );
  TestValidator.predicate(
    "should include TestUser2",
    foundTestIds.has(testUser2.id),
  );
  TestValidator.predicate(
    "should include TestUser3",
    foundTestIds.has(testUser3.id),
  );
  // 5. Test 2: Search by display_name "Test" with is_banned=false (active only)
  const search2 = await searchMembers({
    display_name: "Test",
    is_banned: false,
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find 3 active members with 'Test' in display name",
    search2.data.length,
    3,
  );
  // 6. Test 3: Search by display_name "Test" with is_banned=true (should find none)
  const search3 = await searchMembers({
    display_name: "Test",
    is_banned: true,
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find 0 banned members with 'Test' in display name",
    search3.data.length,
    0,
  );
  // 7. Test 4: Search by display_name "Banned" with is_banned=false (should find 2 before banning)
  const search4 = await searchMembers({
    display_name: "Banned",
    is_banned: false,
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find 2 active members with 'Banned' in display name before ban",
    search4.data.length,
    2,
  );
  // Note: Since there's no API to ban members in the provided SDK, we cannot test
  // the banned status filtering fully. The scenario mentions banning but the
  // necessary API endpoints are not provided in the SDK.
  // 8. Test 5: Admin grade filtering - search by display_name "Admin" with admin_grade=null
  const search5 = await searchMembers({
    display_name: "Admin",
    admin_grade: null,
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find regular member with 'Admin' in display name",
    search5.data.length,
    1,
  );
  // 9. Test 6: Combined search with specific display_name
  const search6 = await searchMembers({
    display_name: "TestUser1",
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find exactly 1 member with exact display name 'TestUser1'",
    search6.data.length,
    1,
  );
  TestValidator.equals(
    "should match TestUser1 ID",
    search6.data[0]!.id,
    testUser1.id,
  );
  // 10. Test 7: Pagination test
  const search7 = await searchMembers({
    display_name: "User", // Should match all users
    page: 1,
    limit: 2,
  });
  TestValidator.predicate(
    "pagination should have correct total records",
    search7.pagination.records >= 6,
  );
  TestValidator.equals(
    "should return exactly 2 items per page",
    search7.data.length,
    2,
  );
  TestValidator.predicate(
    "should have correct page count",
    search7.pagination.pages >= 3,
  );
  // 11. Test 8: Empty search result
  const search8 = await searchMembers({
    display_name: "NonExistentUser12345",
    page: 1,
    limit: 10,
  });
  TestValidator.equals(
    "should find 0 members with non-existent display name",
    search8.data.length,
    0,
  );
  TestValidator.equals(
    "should have 0 records for non-existent search",
    search8.pagination.records,
    0,
  );
}
