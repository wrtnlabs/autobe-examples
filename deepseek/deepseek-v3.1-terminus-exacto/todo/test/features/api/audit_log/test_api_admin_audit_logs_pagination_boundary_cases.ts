import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination boundary cases and edge scenarios for audit log retrieval.
 * Validate pagination behavior when there are no audit logs matching filter criteria,
 * when requesting pages beyond the available data range, and when using minimum/maximum
 * page sizes. Test sorting consistency across paginated results and verify that
 * pagination metadata accurately reflects the total record count and available pages.
 * Ensure proper handling of empty result sets and boundary conditions for compliance
 * monitoring workflows.
 */
export async function test_api_admin_audit_logs_pagination_boundary_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - use utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test with no filters - get baseline to understand available data
  const baseline = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    },
  );
  typia.assert(baseline);
  // 3. Test empty result set with impossible filter
  const emptyFilter = {
    body: {
      event_type: RandomGenerator.alphabets(20), // Random string that likely doesn't exist
      page: 1,
      limit: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    } satisfies IMultiUserTodoAuditLog.IRequest,
  };
  const emptyResult = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    emptyFilter,
  );
  typia.assert(emptyResult);
  // Validate empty result set metadata
  TestValidator.equals(
    "empty result data array length",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for empty result",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty result",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    emptyResult.pagination.limit > 0,
  );
  // 4. Test minimum page size (limit = 1)
  const minPageSize = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1 satisfies number as number,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    },
  );
  typia.assert(minPageSize);
  TestValidator.equals("minimum limit", minPageSize.pagination.limit, 1);
  TestValidator.predicate(
    "data length ≤ limit for min page",
    minPageSize.data.length <= minPageSize.pagination.limit,
  );
  // 5. Test maximum page size (limit = 100)
  const maxPageSize = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100 satisfies number as number,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    },
  );
  typia.assert(maxPageSize);
  TestValidator.equals("maximum limit", maxPageSize.pagination.limit, 100);
  TestValidator.predicate(
    "data length ≤ limit for max page",
    maxPageSize.data.length <= maxPageSize.pagination.limit,
  );
  // 6. Test page beyond available data range
  if (baseline.pagination.pages > 0) {
    const beyondPage =
      await api.functional.multiUserTodo.admin.audit_logs.index(
        adminConnection,
        {
          body: {
            page: (baseline.pagination.pages + 10) satisfies number as number,
            limit: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
          } satisfies IMultiUserTodoAuditLog.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.equals(
      "beyond range data should be empty",
      beyondPage.data.length,
      0,
    );
    TestValidator.predicate(
      "current page should be requested page",
      beyondPage.pagination.current >= baseline.pagination.pages + 10,
    );
  }
  // 7. Test sorting consistency by checking order preservation across pages
  if (baseline.pagination.pages > 1 && baseline.pagination.records > 1) {
    const firstPage = await api.functional.multiUserTodo.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1 satisfies number as number,
        } satisfies IMultiUserTodoAuditLog.IRequest,
      },
    );
    typia.assert(firstPage);
    const secondPage =
      await api.functional.multiUserTodo.admin.audit_logs.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 1 satisfies number as number,
          } satisfies IMultiUserTodoAuditLog.IRequest,
        },
      );
    typia.assert(secondPage);
    // Verify different items on different pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "different pages should have different items",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // 8. Test pagination metadata accuracy across different filters
  const testFilters = [
    { event_type: "user_login" satisfies string as string },
    { actor_type: "admin" satisfies string as string },
    { success_flag: true satisfies boolean as boolean },
  ] as const;
  for (const filter of testFilters) {
    const filteredResult =
      await api.functional.multiUserTodo.admin.audit_logs.index(
        adminConnection,
        {
          body: {
            ...filter,
            page: 1,
            limit: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<20>
            >(),
          } satisfies IMultiUserTodoAuditLog.IRequest,
        },
      );
    typia.assert(filteredResult);
    // Basic pagination metadata validation
    TestValidator.predicate(
      "records should be non-negative",
      filteredResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages should be non-negative",
      filteredResult.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "current page should be 1",
      filteredResult.pagination.current === 1,
    );
    TestValidator.predicate(
      "limit should be positive",
      filteredResult.pagination.limit > 0,
    );
    // Data length validation
    TestValidator.predicate(
      `data length ≤ limit for filter ${Object.keys(filter)[0]}`,
      filteredResult.data.length <= filteredResult.pagination.limit,
    );
  }
  // 9. Test combined filters that yield no results
  const combinedEmptyFilter = {
    body: {
      event_type: "non_existent_event" satisfies string as string,
      actor_type: "non_existent_actor" satisfies string as string,
      success_flag: true satisfies boolean as boolean,
      page: 1,
      limit: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    } satisfies IMultiUserTodoAuditLog.IRequest,
  };
  const combinedEmptyResult =
    await api.functional.multiUserTodo.admin.audit_logs.index(
      adminConnection,
      combinedEmptyFilter,
    );
  typia.assert(combinedEmptyResult);
  TestValidator.equals(
    "combined filter empty data",
    combinedEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined filter zero records",
    combinedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter zero pages",
    combinedEmptyResult.pagination.pages,
    0,
  );
}
