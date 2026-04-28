import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Verify employee listing filters records correctly by employment status and type.
 *
 * Tests that the employee listing endpoint correctly applies filters for employment status and employment type. Creates employees with different employment classifications (full-time and part-time) and validates that filtering by employment type returns only matching employees.
 *
 * 1. Authenticate as a new member who becomes the organization owner.
 * 2. Create an employee with employment_type 'full-time' and status 'active'.
 * 3. Create a second employee with employment_type 'part-time' and status 'active'.
 * 4. List employees filtered by status='active' and employment_type='full-time'.
 * 5. Validate that only the full-time employee is returned.
 * 6. List employees filtered by status='active' and employment_type='part-time'.
 * 7. Validate that only the part-time employee is returned.
 */
export async function test_api_employee_list_filter_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(memberConnection, {});
  typia.assert(owner);
  // 2. Create a full-time employee
  const fullTimeEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          employmentType: "full-time",
        },
      },
    );
  typia.assert(fullTimeEmployee);
  // 3. Create a part-time employee
  const partTimeEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          employmentType: "part-time",
        },
      },
    );
  typia.assert(partTimeEmployee);
  // 4. Filter by status='active' and employment_type='full-time'
  const filterFullTime = {
    status: "active",
    employment_type: "full-time",
  } satisfies IHrmPlatformEmployee.IRequest;
  const fullTimeResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: filterFullTime,
    });
  typia.assert(fullTimeResult);
  // 5. Validate: only full-time employee returned
  TestValidator.equals(
    "full-time filter returns 1 employee",
    fullTimeResult.data.length,
    1,
  );
  TestValidator.equals(
    "full-time filter returns correct employment type",
    fullTimeResult.data[0].employment_type,
    "full-time",
  );
  TestValidator.equals(
    "full-time filter returns correct status",
    fullTimeResult.data[0].status,
    "active",
  );
  TestValidator.predicate("full-time filter excludes part-time employee", () =>
    fullTimeResult.data.every((e) => e.employment_type !== "part-time"),
  );
  // 6. Filter by status='active' and employment_type='part-time'
  const filterPartTime = {
    status: "active",
    employment_type: "part-time",
  } satisfies IHrmPlatformEmployee.IRequest;
  const partTimeResult =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: filterPartTime,
    });
  typia.assert(partTimeResult);
  // 7. Validate: only part-time employee returned
  TestValidator.equals(
    "part-time filter returns 1 employee",
    partTimeResult.data.length,
    1,
  );
  TestValidator.equals(
    "part-time filter returns correct employment type",
    partTimeResult.data[0].employment_type,
    "part-time",
  );
  TestValidator.equals(
    "part-time filter returns correct status",
    partTimeResult.data[0].status,
    "active",
  );
  TestValidator.predicate("part-time filter excludes full-time employee", () =>
    partTimeResult.data.every((e) => e.employment_type !== "full-time"),
  );
}
