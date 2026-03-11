import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic pagination functionality of the admin accounts search endpoint.
 * Verify that the system correctly handles page and limit parameters, returns the
 * expected number of records per page, and provides accurate pagination metadata
 * including current page, limit, total records, and total pages.
 */
export async function test_api_admin_accounts_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin connection for setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Create multiple admin accounts for pagination testing
  const adminCount = 35; // Enough for multiple pages
  const adminIds: string[] = [];
  for (let i = 0; i < adminCount; i++) {
    const admin = await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    });
    typia.assert(admin);
    adminIds.push(admin.id);
  }
  // Test 1: Page 1 with limit 10 (default page should be 1)
  const page1 = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page1 response is IPageIMultiUserTodoAdmin.ISummary",
    page1.data.length <= page1.pagination.limit,
    true,
  );
  TestValidator.predicate(
    "page1 has pagination data",
    page1.pagination.records >= adminCount,
  );
  TestValidator.predicate(
    "page1 current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "page1 has valid limit",
    page1.pagination.limit >= 1 && page1.pagination.limit <= 100,
  );
  // Test 2: Explicit page 1 with limit 10
  const page1Explicit = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(page1Explicit);
  TestValidator.equals(
    "page1Explicit has 10 or fewer items",
    page1Explicit.data.length,
    Math.min(10, page1Explicit.pagination.records),
  );
  TestValidator.equals(
    "page1Explicit current page",
    page1Explicit.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1Explicit limit",
    page1Explicit.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page1Explicit has pages >= 3",
    page1Explicit.pagination.pages >= 3,
  );
  // Test 3: Page 2 with limit 10
  const page2 = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        page: 2 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page2 has 10 or fewer items",
    page2.data.length,
    Math.min(10, page2.pagination.records - 10),
  );
  TestValidator.equals("page2 current page", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page2 total records matches page1",
    page2.pagination.records,
    page1Explicit.pagination.records,
  );
  // Verify page 2 has different records than page 1
  const page1Ids = new Set(page1Explicit.data.map((item) => item.id));
  const page2Ids = new Set(page2.data.map((item) => item.id));
  TestValidator.predicate(
    "page1 and page2 have no overlapping IDs",
    Array.from(page2Ids).every((id) => !page1Ids.has(id)),
  );
  // Test 4: Page 3 with limit 10 (might be last page)
  const page3 = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        page: 3 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.predicate(
    "page3 has between 1 and 10 items",
    page3.data.length >= 1 && page3.data.length <= 10,
  );
  TestValidator.equals("page3 current page", page3.pagination.current, 3);
  TestValidator.predicate(
    "page3 is last or near last page",
    page3.pagination.current >= page3.pagination.pages - 1,
  );
  // Test 5: Custom limit (15)
  const customLimit = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 15 satisfies number as number,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(customLimit);
  TestValidator.equals(
    "customLimit has 15 or fewer items",
    customLimit.data.length,
    Math.min(15, customLimit.pagination.records),
  );
  TestValidator.equals("customLimit limit", customLimit.pagination.limit, 15);
  TestValidator.predicate(
    "customLimit pages less than with limit 10",
    customLimit.pagination.pages < page1Explicit.pagination.pages,
  );
  // Test 6: Verify all returned records have valid summary structure
  const allRecords = [...page1Explicit.data, ...page2.data, ...page3.data];
  for (const record of allRecords) {
    typia.assert<IMultiUserTodoAdmin.ISummary>(record);
    TestValidator.predicate(
      "record has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        record.id,
      ),
    );
    TestValidator.predicate(
      "record has valid email",
      /^[^@]+@[^@]+\.[^@]+$/.test(record.email),
    );
    TestValidator.predicate(
      "record has display name",
      typeof record.display_name === "string" && record.display_name.length > 0,
    );
    TestValidator.predicate(
      "record has valid created_at",
      !isNaN(Date.parse(record.created_at)),
    );
  }
  // Test 7: Verify pagination calculations
  const totalRecords = page1Explicit.pagination.records;
  const limit = 10;
  const expectedPages = Math.ceil(totalRecords / limit);
  TestValidator.equals(
    "pagination pages calculation",
    page1Explicit.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "records count is consistent",
    totalRecords >= adminCount,
  );
}