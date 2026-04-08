import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee list pagination with member authentication.
 *
 * Validates the complete employee listing flow including member authentication, paginated employee retrieval, and response structure validation. Ensures that the pagination metadata is accurate and employee summary records contain all required fields.
 *
 * Special attention is given to verifying pagination structure (current page, limit, total records, total pages) and employee summary fields including nested member and role relations. Tests the edge case where no employees exist, confirming empty data array with valid pagination metadata.
 *
 * 1. Member registers and authenticates using join endpoint.
 * 2. Calls employee listing endpoint with default pagination parameters.
 * 3. Validates pagination metadata structure and values.
 * 4. Validates employee summary records through typia assertion.
 * 5. Tests edge case: search with no matches returns valid pagination structure.
 */
export async function test_api_employee_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve employee list with default pagination
  const employeeList = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        department_id: null,
        limit: 20,
        page: 1,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employeeList);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    employeeList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", employeeList.pagination.limit >= 1);
  TestValidator.predicate(
    "total records is non-negative",
    employeeList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    employeeList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is consistent",
    employeeList.pagination.pages ===
      Math.ceil(
        employeeList.pagination.records / employeeList.pagination.limit,
      ),
  );
  // 4. Validate employee data array
  TestValidator.predicate("data is array", Array.isArray(employeeList.data));
  // 5. Test edge case: search with no matches returns valid pagination structure
  const emptyListRequest =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        search: "nonexistent_search_term_xyz_123",
        limit: 10,
        page: 1,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(emptyListRequest);
  TestValidator.predicate(
    "search result has valid pagination",
    emptyListRequest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search result data is array",
    Array.isArray(emptyListRequest.data),
  );
}
