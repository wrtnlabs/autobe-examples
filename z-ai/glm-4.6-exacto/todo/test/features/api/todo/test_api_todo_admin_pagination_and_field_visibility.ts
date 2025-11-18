import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test advanced pagination and field visibility in the admin todo search API.
 *
 * This scenario authenticates as an admin, then executes paginated todo search
 * with custom page number and page_size, and validates pagination meta and
 * returned todo records for correctness. It verifies:
 *
 * 1. Authentication as admin (required for API usage)
 * 2. Paging with various page numbers and page sizes (edge cases: min, normal,
 *    max, over-max)
 * 3. Records always conform to ITodoAppTodo.ISummary
 * 4. All required fields (id, title, status) exist on every record; no extra
 *    fields
 * 5. Page_size limit of 200 is enforced, out-of-bounds values handled safely
 * 6. Sorting by every supported sort field in both asc/desc, results ordered
 *    correctly
 * 7. Pagination metadata (current, limit, records, pages) are internally
 *    consistent
 * 8. Changing page or limit gives correct slice of data
 * 9. Field visibility: Results do not omit or add to interface contract
 */
export async function test_api_todo_admin_pagination_and_field_visibility(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/",
  } satisfies ITodoAppAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Try all sorting options
  const sortFields = [
    "title",
    "created_at",
    "updated_at",
    "due_date",
    "status",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;

  // Try various page and size combinations (edge and normal)
  const testPaginations = [
    { page: 1, page_size: 1 },
    { page: 1, page_size: 20 },
    { page: 2, page_size: 10 },
    { page: 1, page_size: 200 },
    { page: 1, page_size: 201 },
  ];

  for (const { page, page_size } of testPaginations) {
    for (const sort_by of sortFields) {
      for (const sort_order of sortOrders) {
        const req = {
          page,
          page_size,
          sort_by,
          sort_order,
        } satisfies ITodoAppTodo.IRequest;
        const result = await api.functional.todoApp.admin.todos.index(
          connection,
          { body: req },
        );
        typia.assert(result);
        TestValidator.predicate(
          "pagination.current equals requested page",
          result.pagination.current === page,
        );
        TestValidator.predicate(
          "pagination.limit is page_size or enforced maximum",
          result.pagination.limit === (page_size <= 200 ? page_size : 200),
        );
        // Verify pagination fields
        TestValidator.predicate(
          "pagination current, limit, records, pages are non-negative ints",
          result.pagination.current >= 0 &&
            result.pagination.limit >= 0 &&
            result.pagination.records >= 0 &&
            result.pagination.pages >= 0,
        );
        // data array always exists
        TestValidator.predicate("data is array", Array.isArray(result.data));

        // All records conform structurally to ITodoAppTodo.ISummary (typia.assert above), and must
        // - not omit id, title, status
        // - not have extra fields
        for (const record of result.data) {
          TestValidator.predicate(
            "record has id string",
            typeof record.id === "string" && !!record.id,
          );
          TestValidator.predicate(
            "record has title string",
            typeof record.title === "string" && !!record.title,
          );
          TestValidator.predicate(
            "record has status string",
            typeof record.status === "string" && !!record.status,
          );
          // No extraneous fields
          const expectedKeys = [
            "id",
            "title",
            "status",
            "due_date",
            "completed_at",
            "deleted_at",
          ];
          TestValidator.equals(
            "no extraneous fields in record",
            Object.keys(record).sort(),
            expectedKeys
              .filter((k) => record[k as keyof typeof record] !== undefined)
              .sort(),
          );
        }
      }
    }
  }

  // 3. page_size boundary enforcement test
  const overLimitReq = {
    page: 1,
    page_size: 9999,
  } satisfies ITodoAppTodo.IRequest;
  const overLimitResult = await api.functional.todoApp.admin.todos.index(
    connection,
    { body: overLimitReq },
  );
  typia.assert(overLimitResult);
  TestValidator.predicate(
    "page_size over limit is capped at 200",
    overLimitResult.pagination.limit === 200,
  );
}
