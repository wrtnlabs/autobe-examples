import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_monitoring_filtered_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test filter with future date (should return no results)
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const futureFilterResponse =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(futureFilterResponse);
  // Validate empty results for future date filter
  TestValidator.equals(
    "future date filter data array empty",
    futureFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "future date filter total records",
    futureFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date filter total pages",
    futureFilterResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date filter current page",
    futureFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "future date filter limit",
    futureFilterResponse.pagination.limit,
    10,
  );
  // Test filter with non-matching IP pattern (should return no results)
  // Use a valid IPv4 pattern that won't match any existing sessions
  const ipFilterResponse =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          ip: "192.168.254.254",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(ipFilterResponse);
  // Validate empty results for IP filter
  TestValidator.equals(
    "IP filter data array empty",
    ipFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "IP filter total records",
    ipFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "IP filter total pages",
    ipFilterResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "IP filter current page",
    ipFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "IP filter limit",
    ipFilterResponse.pagination.limit,
    10,
  );
  // Test combination of filters (should return no results)
  const combinedFilterResponse =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate,
          ip: "192.168.254.254",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate empty results for combined filter
  TestValidator.equals(
    "combined filter data array empty",
    combinedFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "combined filter total records",
    combinedFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter total pages",
    combinedFilterResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filter current page",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilterResponse.pagination.limit,
    10,
  );
}
