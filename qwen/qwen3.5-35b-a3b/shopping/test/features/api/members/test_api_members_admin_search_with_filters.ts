import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_members_admin_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test data for filtering
  const testEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const testDisplayName = RandomGenerator.name();
  const testPhoneNumber = RandomGenerator.mobile();
  const testDateFrom = RandomGenerator.date(
    new Date(),
    -1000 * 60 * 60 * 24 * 30,
  );
  const testDateTo = RandomGenerator.date(new Date(), -1000 * 60 * 60 * 24 * 7);
  // Test 1: Search by email filter (partial match)
  const emailResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: testEmail.slice(0, 4),
        display_name: undefined,
        phone_number: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_field: "created_at",
        sort_order: "DESC",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(emailResult!);
  // Test 2: Search by display_name filter (partial match)
  const nameResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: testDisplayName.slice(0, 3),
        phone_number: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_field: "email",
        sort_order: "ASC",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(nameResult!);
  // Test 3: Search by phone_number filter (partial match)
  const phoneResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: undefined,
        phone_number: testPhoneNumber.slice(0, 5),
        from_date: undefined,
        to_date: undefined,
        sort_field: "phone_number",
        sort_order: "DESC",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(phoneResult!);
  // Test 4: Date range filtering
  const dateRangeResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: undefined,
        phone_number: undefined,
        from_date: testDateFrom.toISOString().split("T")[0],
        to_date: testDateTo.toISOString().split("T")[0],
        sort_field: "created_at",
        sort_order: "ASC",
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(dateRangeResult!);
  // Test 5: Sort by updated_at with descending order
  const sortResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: undefined,
        phone_number: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_field: "updated_at",
        sort_order: "DESC",
        page: 1,
        limit: 30,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(sortResult!);
  // Test 6: Pagination - page 2 with limit 10
  const page2Result = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: undefined,
        phone_number: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_field: "created_at",
        sort_order: "DESC",
        page: 2,
        limit: 10,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(page2Result!);
  // Test 7: Maximum limit (100)
  const maxLimitResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: undefined,
        phone_number: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_field: "email",
        sort_order: "ASC",
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(maxLimitResult!);
  // Test 8: Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", page2Result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is positive",
    page2Result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is greater than 0",
    page2Result.pagination.pages > 0,
  );
  // Test 9: Verify response fields exist and are correct types
  if (page2Result.data.length > 0) {
    const firstMember = page2Result.data[0];
    TestValidator.equals("member has uuid id", typeof firstMember.id, "string");
    TestValidator.equals(
      "member has email",
      typeof firstMember.email,
      "string",
    );
    TestValidator.predicate(
      "member has display_name",
      firstMember.display_name === null ||
        typeof firstMember.display_name === "string",
    );
    TestValidator.predicate(
      "member has phone_number",
      firstMember.phone_number === null ||
        typeof firstMember.phone_number === "string",
    );
    TestValidator.predicate(
      "member has created_at",
      firstMember.created_at !== null && firstMember.created_at !== undefined,
    );
    TestValidator.predicate(
      "member has updated_at",
      firstMember.updated_at !== null && firstMember.updated_at !== undefined,
    );
    TestValidator.predicate(
      "member has deleted_at",
      firstMember.deleted_at === null ||
        typeof firstMember.deleted_at === "string",
    );
  }
  // Test 10: Test with all filters undefined (should return all members)
  const allMembersResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        email: undefined,
        display_name: undefined,
        phone_number: undefined,
        from_date: undefined,
        to_date: undefined,
        sort_field: undefined,
        sort_order: undefined,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallMember.IRequest,
    },
  );
  typia.assert(allMembersResult!);
  // Verify all members endpoint returns valid structure
  TestValidator.equals(
    "all members pagination valid",
    allMembersResult.pagination.current,
    1,
  );
}
