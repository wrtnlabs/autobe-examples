import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardMember";

export async function test_api_member_list_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to gain access to member search functionality
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!@#",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create multiple test member accounts with varied email patterns
  const testMembers: IEconomicBoardMember.IAuthorized[] = [];
  const emails: string[] = [];

  // Create 5 members with different email patterns
  const members = ArrayUtil.repeat(5, async (index) => {
    const email = `member${index + 1}@test${index + 1}.com`;
    emails.push(email);
    const member: IEconomicBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: email,
          password_hash: "hashed_password_" + index,
        } satisfies IEconomicBoardMember.ICreate,
      });
    typia.assert(member);
    return member;
  });
  testMembers.push(...(await Promise.all(members)));

  // Step 3: Verify search functionality with various criteria

  // Test 1: Search with email pattern
  const searchResult1: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        search: "member1",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.equals(
    "search results count match expected",
    searchResult1.pagination.records,
    1,
  );
  TestValidator.equals(
    "search results contain member1 member",
    searchResult1.data[0].email,
    "member1@test1.com",
  );

  // Test 2: Search with pagination
  const searchResult2: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.equals(
    "pagination limits match",
    searchResult2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "first page has 2 records",
    searchResult2.data.length,
    2,
  );

  // Test 3: Search with sorting by creation date (desc)
  const searchResult3: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        sortBy: "created_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.equals(
    "sort by created_at desc has 5 records",
    searchResult3.data.length,
    5,
  );
  // Verify creation date is in descending order (newest first)
  for (let i = 0; i < searchResult3.data.length - 1; i++) {
    const currentDate = new Date(searchResult3.data[i].created_at);
    const nextDate = new Date(searchResult3.data[i + 1].created_at);
    TestValidator.predicate(
      "creation dates in descending order",
      currentDate >= nextDate,
    );
  }

  // Test 4: Search with empty search term (should return all members)
  const searchResult4: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        search: "",
        page: 1,
        limit: 100,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty search returns all members",
    searchResult4.pagination.records,
    testMembers.length,
  );

  // Test 5: Search with non-existent email pattern
  const searchResult5: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        search: "nonexistent",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(searchResult5);
  TestValidator.equals(
    "non-existent search returns no results",
    searchResult5.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data array for non-existent search",
    searchResult5.data.length,
    0,
  );

  // Test 6: Search with multiple criteria - email pattern with sorting
  const searchResult6: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        search: "member",
        sortBy: "email",
        order: "asc",
        page: 1,
        limit: 5,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(searchResult6);
  TestValidator.equals(
    "mixed criteria returns correct count",
    searchResult6.pagination.records,
    5,
  );
  // Verify sorting by email in ascending order
  for (let i = 0; i < searchResult6.data.length - 1; i++) {
    TestValidator.predicate(
      "emails in ascending order",
      () => searchResult6.data[i].email < searchResult6.data[i + 1].email,
    );
  }

  // Step 4: Verify response format and absence of sensitive fields
  const comprehensiveResult: IPageIEconomicBoardMember =
    await api.functional.economicBoard.admin.members.search(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardMember.IRequest,
    });
  typia.assert(comprehensiveResult);

  // Verify each member object contains only allowed fields (no password_hash or auth_jwt_id)
  comprehensiveResult.data.forEach((member) => {
    // These fields should be present
    TestValidator.predicate(
      "member has id field",
      () => member.id !== undefined,
    );
    TestValidator.predicate(
      "member has email field",
      () => member.email !== undefined,
    );
    TestValidator.predicate(
      "member has created_at field",
      () => member.created_at !== undefined,
    );
    TestValidator.predicate(
      "member has verified_at field",
      () => member.verified_at !== undefined,
    );
    TestValidator.predicate(
      "member has last_login field",
      () => member.last_login !== undefined,
    );
    TestValidator.predicate(
      "member has is_active field",
      () => member.is_active !== undefined,
    );

    // These sensitive fields should NOT be present
    TestValidator.predicate(
      "member has no password_hash field",
      () => !("password_hash" in member),
    );
    TestValidator.predicate(
      "member has no auth_jwt_id field",
      () => !("auth_jwt_id" in member),
    );
  });

  // Verify pagination metadata structure and correctness
  TestValidator.equals(
    "current page number is 1",
    comprehensiveResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is reasonable",
    comprehensiveResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is greater than 0",
    () => comprehensiveResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count is greater than 0",
    () => comprehensiveResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "records is consistent with total members",
    () => comprehensiveResult.pagination.records === testMembers.length,
  );
}
