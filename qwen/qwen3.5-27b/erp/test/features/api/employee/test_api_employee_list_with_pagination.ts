import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee list retrieval with pagination functionality.
 *
 * Validates the complete employee list endpoint with pagination support, ensuring proper response structure and data integrity. The test authenticates as a member, retrieves paginated employee data, and verifies that the response contains valid pagination metadata and employee summary records with correct field types.
 *
 * Special attention is given to verifying nullable fields (department and role), employment type enum values, and status enum values. The test ensures that the pagination metadata correctly reflects the current page, limit, total records, and total pages.
 *
 * 1. Authenticate as a member using the authorize_member_join utility function
 * 2. Call the employee list endpoint with pagination parameters (limit: 10, page: 1)
 * 3. Validate the response structure matches IPageIHrmTimeTrackEmployee.ISummary
 * 4. Verify pagination metadata contains valid values and correct calculations
 * 5. Validate employment_type and status enum values for each employee
 */
export async function test_api_employee_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Call employee list endpoint with pagination
  const request = {
    limit: 10,
    page: 1,
  } satisfies IHrmTimeTrackEmployee.IRequest;
  const response = await api.functional.hrmTimeTrack.member.employees.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate employee data - business logic checks only
  const validEmploymentTypes = [
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const;
  const validStatuses = ["active", "deactivated"] as const;
  for (const employee of response.data) {
    // Validate employment_type enum value
    TestValidator.predicate(
      `employee ${employee.id} has valid employment_type`,
      validEmploymentTypes.includes(
        employee.employment_type as (typeof validEmploymentTypes)[number],
      ),
    );
    // Validate status enum value
    TestValidator.predicate(
      `employee ${employee.id} has valid status`,
      validStatuses.includes(employee.status as (typeof validStatuses)[number]),
    );
    // Validate member email is present
    TestValidator.predicate(
      `employee ${employee.id} has member email`,
      employee.member.email.length > 0,
    );
  }
}
