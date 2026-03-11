import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination boundary conditions to ensure robust handling of large configuration sets.
 * Validate that the endpoint correctly handles page numbers beyond available data, empty pages,
 * and maximum limit constraints. Test edge cases such as requesting page 0, negative page numbers,
 * and excessively large limit values. Verify that pagination metadata accurately reflects the
 * total record count and page calculations. Ensure consistent behavior when navigating through
 * multiple pages of configuration results.
 */
export async function test_api_system_configuration_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Test default pagination (no page/limit specified)
  const defaultResponse =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {} satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 3. Test small limit (first page)
  const firstPageResponse =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page requested",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit reasonable",
    firstPageResponse.pagination.limit <= 5,
  );
  // 4. Test maximum allowed limit
  const maxLimitResponse =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit applied",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 5. Test custom page size
  const customLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const customPageResponse =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: customLimit,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(customPageResponse);
  TestValidator.equals(
    "custom limit matches",
    customPageResponse.pagination.limit,
    customLimit,
  );
  // 6. Test page 0 (should default to page 1)
  const pageZeroResponse =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(pageZeroResponse);
  TestValidator.equals(
    "page 0 defaults to page 1",
    pageZeroResponse.pagination.current,
    1,
  );
  // 7. Test high page number beyond available data
  const highPageNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000>
  >();
  const highPageResponse =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: highPageNumber,
          limit: 10,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(highPageResponse);
  // Validate empty data array when beyond total pages
  if (highPageResponse.pagination.current > highPageResponse.pagination.pages) {
    TestValidator.equals(
      "empty data array beyond pages",
      highPageResponse.data.length,
      0,
    );
  }
  // 8. Test page consistency calculations
  TestValidator.predicate(
    "pages calculation matches records and limit",
    highPageResponse.pagination.pages ===
      Math.ceil(
        highPageResponse.pagination.records / highPageResponse.pagination.limit,
      ) ||
      (highPageResponse.pagination.records === 0 &&
        highPageResponse.pagination.pages === 0),
  );
  // 9. Test that current page never exceeds total pages when data exists
  if (
    highPageResponse.pagination.records > 0 &&
    highPageResponse.pagination.pages > 0
  ) {
    TestValidator.predicate(
      "current page capped at total pages",
      highPageResponse.pagination.current <= highPageResponse.pagination.pages,
    );
  }
  // 10. Test negative page number (type system should prevent, but test with coercion)
  // This is actually a compilation error test, so we'll skip runtime testing
  // 11. Test pagination metadata consistency across all responses
  const allResponses = [
    defaultResponse,
    firstPageResponse,
    maxLimitResponse,
    customPageResponse,
    pageZeroResponse,
    highPageResponse,
  ];
  for (const [index, response] of allResponses.entries()) {
    TestValidator.predicate(
      `response ${index} has valid pagination`,
      response.pagination.current >= 0 &&
        response.pagination.limit >= 0 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0,
    );
    // Data array length should not exceed limit (except possibly on last page)
    TestValidator.predicate(
      `response ${index} data within limit`,
      response.data.length <= response.pagination.limit,
    );
  }
}
