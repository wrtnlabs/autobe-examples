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
 * Test employee reports pagination and filtering for authenticated members.
 *
 * Validates the complete employee reports workflow including member authentication and paginated employee list retrieval. Ensures that authenticated members can access employee summaries with essential information and that pagination metadata is correctly computed.
 *
 * The test verifies that employee data includes member identity, department assignment, role information, employment type classification, and status tracking. Pagination metadata is validated to ensure accurate record counts and page calculations.
 *
 * 1. Register and authenticate a new member account.
 * 2. Retrieve paginated employee reports using authenticated connection.
 * 3. Validate response structure with typia.assert() for complete type validation.
 * 4. Verify pagination metadata (current, limit, records, pages).
 * 5. Validate employee summary data structure and business rules.
 */
export async function test_api_employee_reports_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Retrieve employee reports
  const reports =
    await api.functional.hrmTimeTrack.member.reports.employees.report(
      memberConnection,
    );
  typia.assert(reports);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    reports.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    reports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is consistent",
    reports.pagination.pages ===
      Math.ceil(reports.pagination.records / reports.pagination.limit),
  );
  // 4. Validate employee summary data
  await ArrayUtil.asyncForEach(reports.data, async (employee) => {
    typia.assert(employee);
    // Validate employee has valid ID
    TestValidator.predicate(
      "employee has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        employee.id,
      ),
    );
    // Validate member information exists
    typia.assert(employee.member);
    // Validate position is present
    TestValidator.predicate(
      "employee has position",
      employee.position.length > 0,
    );
    // Validate employment type is one of expected values
    const validEmploymentTypes = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ] as const;
    TestValidator.predicate(
      "employment type is valid",
      (validEmploymentTypes as readonly string[]).includes(
        employee.employment_type,
      ),
    );
    // Validate status is one of expected values
    const validStatuses = ["active", "deactivated"] as const;
    TestValidator.predicate(
      "status is valid",
      (validStatuses as readonly string[]).includes(employee.status),
    );
    // Department and role are nullable - validate if present
    if (employee.department !== null) {
      typia.assert(employee.department);
    }
    if (employee.role !== null) {
      typia.assert(employee.role);
    }
  });
  // 5. Validate data array length matches pagination
  TestValidator.equals(
    "data array length matches page size or remaining records",
    reports.data.length,
    Math.min(
      reports.pagination.limit,
      reports.pagination.records -
        (reports.pagination.current - 1) * reports.pagination.limit,
    ),
  );
}
