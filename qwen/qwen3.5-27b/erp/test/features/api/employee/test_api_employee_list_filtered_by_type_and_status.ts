import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function test_api_employee_list_filtered_by_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test employee listing with filtering capabilities.
   * Verifies that members can filter employees by employment type (full-time, part-time, contractor, intern)
   * and status (active, deactivated). Tests multiple filter combinations to ensure correct filtering behavior.
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test filtering by employment_type = 'full-time'
  const fullTimeResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "full-time",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(fullTimeResult);
  // Verify all returned employees are full-time
  TestValidator.predicate(
    "all employees are full-time",
    fullTimeResult.data.every((emp) => emp.employment_type === "full-time"),
  );
  // Verify pagination records reflect filtered count
  TestValidator.equals(
    "pagination records match filtered data",
    fullTimeResult.pagination.records,
    fullTimeResult.data.length,
  );
  // 3. Test filtering by employment_type = 'part-time'
  const partTimeResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "part-time",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(partTimeResult);
  TestValidator.predicate(
    "all employees are part-time",
    partTimeResult.data.every((emp) => emp.employment_type === "part-time"),
  );
  // 4. Test filtering by status = 'active'
  const activeResult = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate(
    "all employees are active",
    activeResult.data.every((emp) => emp.status === "active"),
  );
  // 5. Test filtering by status = 'deactivated'
  const deactivatedResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        status: "deactivated",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(deactivatedResult);
  TestValidator.predicate(
    "all employees are deactivated",
    deactivatedResult.data.every((emp) => emp.status === "deactivated"),
  );
  // 6. Test combined filtering: employment_type='contractor' AND status='active'
  const activeContractorResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "contractor",
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(activeContractorResult);
  TestValidator.predicate(
    "all employees are active contractors",
    activeContractorResult.data.every(
      (emp) => emp.employment_type === "contractor" && emp.status === "active",
    ),
  );
  // 7. Test combined filtering: employment_type='intern' AND status='deactivated'
  const deactivatedInternResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "intern",
        status: "deactivated",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(deactivatedInternResult);
  TestValidator.predicate(
    "all employees are deactivated interns",
    deactivatedInternResult.data.every(
      (emp) => emp.employment_type === "intern" && emp.status === "deactivated",
    ),
  );
  // 8. Test no filters (should return all employees)
  const allResult = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(allResult);
  // Verify pagination works correctly
  TestValidator.predicate(
    "pagination pages calculated correctly",
    allResult.pagination.pages ===
      Math.ceil(allResult.pagination.records / allResult.pagination.limit),
  );
  // 9. Test pagination with filters
  const paginatedResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        employment_type: "full-time",
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated data respects limit",
    paginatedResult.data.length <= 10,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
}
