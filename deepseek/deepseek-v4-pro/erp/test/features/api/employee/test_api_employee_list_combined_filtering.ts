import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test combined filtering with AND-logic, sorting, and pagination on the employee directory.
 *
 * Validates that the employee listing endpoint correctly applies multiple simultaneous filters using AND-logic — returning only employees who match the specified employment type, status, and partial name search term. Also verifies sort ordering by created_at in descending order and that pagination parameters are properly reflected in the response.
 *
 * 1. Authenticate as a member via join to establish organization context.
 * 2. Query employee directory with combined filters: employment_type="full-time", status="active", partial name search.
 * 3. Validate response structure with typia.assert.
 * 4. Verify AND-logic: every returned employee matches employment_type, status, and name search.
 * 5. Verify sort ordering: results sorted by created_at descending.
 * 6. Verify pagination: current page, limit, and page count are consistent.
 */
export async function test_api_employee_list_combined_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Query with combined filters: employment_type, status, name search, sort, and pagination
  const searchTerm = RandomGenerator.alphabets(3);
  const page = 1;
  const limit = 10;
  const result = await api.functional.erpHrm.member.employees.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        employment_type: "full-time",
        status: "active",
        sort: "-created_at",
        page: page satisfies number as number,
        limit: limit satisfies number as number,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    result.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", result.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate AND-logic: every returned employee matches ALL filter criteria
  for (const employee of result.data) {
    TestValidator.equals(
      "employment type is full-time",
      employee.employment_type,
      "full-time",
    );
    TestValidator.equals("status is active", employee.status, "active");
    TestValidator.predicate(
      "display name contains search term",
      employee.member.display_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }
  // 5. Validate sort order: created_at descending
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        "sorted by created_at descending",
        result.data[i - 1].created_at >= result.data[i].created_at,
      );
    }
  }
  // 6. Validate pagination consistency: data length does not exceed limit
  TestValidator.predicate(
    "data length within limit",
    result.data.length <= limit,
  );
}
