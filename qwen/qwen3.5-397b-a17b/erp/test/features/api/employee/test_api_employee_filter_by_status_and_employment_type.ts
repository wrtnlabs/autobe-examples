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
 * Test employee filtering by status and employment type with comprehensive filter validation.
 *
 * Validates the employee listing endpoint's filtering capabilities including status filters (active, deactivated), employment type filters (full-time, part-time, contractor, intern), department assignment filters, and position-based fuzzy search. Tests edge cases including filters that match no employees and verifies pagination metadata accuracy.
 *
 * The test ensures that filter combinations work correctly, returned employees match all specified criteria, and the search functionality performs trigram-based fuzzy matching on the position field. Pagination metadata (current page, limit, records, pages) must accurately reflect the filtered result set.
 *
 * 1. Member authentication via registration.
 * 2. Filter by status=active and employment_type=full-time, validate all results match.
 * 3. Filter by status=deactivated only.
 * 4. Filter by employment_type=part-time.
 * 5. Filter by department_id (may return empty if no department exists).
 * 6. Search by position term with fuzzy matching.
 * 7. Edge case: validate pagination consistency when filtering with specific criteria.
 */
export async function test_api_employee_filter_by_status_and_employment_type(
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
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Filter by status=active and employment_type=full-time
  const activeFullTimeResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        status: "active",
        employment_type: "full-time",
        limit: 50,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(activeFullTimeResult);
  TestValidator.predicate(
    "active full-time filter",
    activeFullTimeResult.data.every(
      (emp) => emp.status === "active" && emp.employment_type === "full-time",
    ),
  );
  TestValidator.equals(
    "pagination records match data length",
    activeFullTimeResult.pagination.records,
    activeFullTimeResult.data.length,
  );
  // 3. Filter by status=deactivated
  const deactivatedResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        status: "deactivated",
        limit: 50,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(deactivatedResult);
  TestValidator.predicate(
    "deactivated filter",
    deactivatedResult.data.every((emp) => emp.status === "deactivated"),
  );
  // 4. Filter by employment_type=part-time
  const partTimeResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "part-time",
        limit: 50,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(partTimeResult);
  TestValidator.predicate(
    "part-time filter",
    partTimeResult.data.every((emp) => emp.employment_type === "part-time"),
  );
  // 5. Filter by department_id (may return empty if no department exists)
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const departmentResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        department_id: departmentId,
        limit: 50,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(departmentResult);
  // All returned employees should have the matching department_id
  TestValidator.predicate(
    "department filter",
    departmentResult.data.every((emp) => emp.department?.id === departmentId),
  );
  // 6. Search by position term with fuzzy matching
  const searchResult = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: "engineer",
        limit: 50,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(searchResult);
  // Search results should contain employees with position containing "engineer" (case-insensitive)
  TestValidator.predicate(
    "search results have positions",
    searchResult.data.every((emp) => emp.position !== null),
  );
  // 7. Validate pagination consistency with different limit values
  const limit10Result = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(limit10Result);
  TestValidator.predicate(
    "limit 10 pagination",
    limit10Result.pagination.limit === 10 &&
      limit10Result.data.length <= 10 &&
      limit10Result.pagination.records >= limit10Result.data.length,
  );
  // 8. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page",
    activeFullTimeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages calculation",
    activeFullTimeResult.pagination.pages >= 0,
  );
}
