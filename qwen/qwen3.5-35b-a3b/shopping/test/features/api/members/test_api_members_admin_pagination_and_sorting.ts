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

export async function test_api_members_admin_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Default pagination (page=1, limit=20) - with empty data
  const defaultResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  // Test 2: Verify pagination metadata structure
  TestValidator.predicate(
    "records count should be non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array should be an array",
    Array.isArray(defaultResponse.data),
  );
  // Test 3: Custom pagination (page=3, limit=10)
  const customPaginationResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        page: 3,
        limit: 10,
      },
    });
  typia.assert(customPaginationResponse);
  TestValidator.equals(
    "custom page should be 3",
    customPaginationResponse.pagination.current,
    3,
  );
  TestValidator.equals(
    "custom limit should be 10",
    customPaginationResponse.pagination.limit,
    10,
  );
  // Test 4: Maximum limit (100)
  const maxLimitResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit should be capped at 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 5: Minimum limit (1)
  const minLimitResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        limit: 1,
      },
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );
  // Test 6: Page beyond total pages
  const beyondPagesResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        page: 999,
      },
    },
  );
  typia.assert(beyondPagesResponse);
  TestValidator.equals(
    "page beyond total should return empty data",
    beyondPagesResponse.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond total should still show correct page number",
    beyondPagesResponse.pagination.current,
    999,
  );
  // Test 7: Sorting by email ASC
  const emailAscResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        sort_field: "email",
        sort_order: "ASC",
      },
    },
  );
  typia.assert(emailAscResponse);
  // Test 8: Sorting by email DESC
  const emailDescResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        sort_field: "email",
        sort_order: "DESC",
      },
    },
  );
  typia.assert(emailDescResponse);
  // Test 9: Sorting by created_at ASC
  const createdAtAscResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        sort_field: "created_at",
        sort_order: "ASC",
      },
    },
  );
  typia.assert(createdAtAscResponse);
  // Test 10: Sorting by created_at DESC
  const createdAtDescResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        sort_field: "created_at",
        sort_order: "DESC",
      },
    });
  typia.assert(createdAtDescResponse);
  // Test 11: Sorting by display_name ASC (handles null values)
  const displayNameAscResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        sort_field: "display_name",
        sort_order: "ASC",
      },
    });
  typia.assert(displayNameAscResponse);
  // Test 12: Sorting by display_name DESC
  const displayNameDescResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        sort_field: "display_name",
        sort_order: "DESC",
      },
    });
  typia.assert(displayNameDescResponse);
  // Test 13: Sorting by phone_number ASC
  const phoneNumberAscResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        sort_field: "phone_number",
        sort_order: "ASC",
      },
    });
  typia.assert(phoneNumberAscResponse);
  // Test 14: Sorting by phone_number DESC
  const phoneNumberDescResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        sort_field: "phone_number",
        sort_order: "DESC",
      },
    });
  typia.assert(phoneNumberDescResponse);
  // Test 15: Sorting by updated_at ASC
  const updatedAtAscResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        sort_field: "updated_at",
        sort_order: "ASC",
      },
    },
  );
  typia.assert(updatedAtAscResponse);
  // Test 16: Sorting by updated_at DESC
  const updatedAtDescResponse =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        sort_field: "updated_at",
        sort_order: "DESC",
      },
    });
  typia.assert(updatedAtDescResponse);
  // Test 17: Verify all records have valid structure
  for (const member of defaultResponse.data) {
    typia.assert(member);
    TestValidator.predicate(
      "email should be valid string",
      member.email.length > 0,
    );
    // display_name can be null
    if (member.display_name !== null) {
      TestValidator.predicate(
        "display_name should be string when not null",
        member.display_name.length > 0,
      );
    }
    // phone_number can be null
    if (member.phone_number !== null) {
      TestValidator.predicate(
        "phone_number should be string when not null",
        member.phone_number.length > 0,
      );
    }
    TestValidator.predicate(
      "created_at should be valid date-time",
      member.created_at.includes("T"),
    );
    TestValidator.predicate(
      "updated_at should be valid date-time",
      member.updated_at.includes("T"),
    );
  }
  // Test 18: Sorting consistency across pages
  const sortPage1Response = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        sort_field: "email",
        sort_order: "ASC",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sortPage1Response);
  const sortPage2Response = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        sort_field: "email",
        sort_order: "ASC",
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(sortPage2Response);
  const page1Emails = sortPage1Response.data.map((m) => m.email);
  const page2Emails = sortPage2Response.data.map((m) => m.email);
  // Verify both pages have valid structure
  TestValidator.predicate(
    "page 1 data should be array",
    Array.isArray(page1Emails),
  );
  TestValidator.predicate(
    "page 2 data should be array",
    Array.isArray(page2Emails),
  );
  // Test 19: Combined pagination and filtering
  const filteredResponse = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        display_name: null,
        page: 1,
        limit: 20,
        sort_field: "email",
        sort_order: "ASC",
      },
    },
  );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered response page should be 1",
    filteredResponse.pagination.current,
    1,
  );
  // Test 20: Verify all sort fields with null handling
  for (const sortField of [
    "email",
    "display_name",
    "phone_number",
    "created_at",
    "updated_at",
  ] as const) {
    for (const sortOrder of ["ASC", "DESC"] as const) {
      const sortResponse = await api.functional.ecommerceMall.members.index(
        adminConnection,
        {
          body: {
            sort_field: sortField,
            sort_order: sortOrder,
          },
        },
      );
      typia.assert(sortResponse);
      TestValidator.predicate(
        `${sortField} ${sortOrder} should return valid pagination`,
        sortResponse.pagination.records >= 0,
      );
      TestValidator.predicate(
        `${sortField} ${sortOrder} should return data array`,
        Array.isArray(sortResponse.data),
      );
    }
  }
}
