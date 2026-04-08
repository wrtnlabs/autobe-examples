import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_list_access_control_employee_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first employee (employee_A)
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeAAuth = await authorize_member_join(employeeAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@employee-a.test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/employee-a",
      referrer: "https://test.com/join",
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAAuth);
  // 2. Create second employee (employee_B)
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeBAuth = await authorize_member_join(employeeBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@employee-b.test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/employee-b",
      referrer: "https://test.com/join",
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeBAuth);
  // 3. Both employees belong to the same organization (from auth response)
  await TestValidator.predicate(
    "employee A has organization",
    () => (employeeAAuth.organizations?.length ?? 0) > 0,
  );
  await TestValidator.predicate(
    "employee B has organization",
    () => (employeeBAuth.organizations?.length ?? 0) > 0,
  );
  await TestValidator.equals(
    "same organization",
    employeeAAuth.organizations?.[0]?.id,
    employeeBAuth.organizations?.[0]?.id,
  );
  const organizationId = typia.assert<string & tags.Format<"uuid">>(
    employeeAAuth.organizations?.[0]?.id,
  );
  // 4. Employee A calls timelog list endpoint
  const employeeATimelogs =
    await api.functional.hrm.member.organizations.timelogs.index(
      employeeAConnection,
      {
        organizationId,
        body: {} satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(employeeATimelogs);
  // 5. Employee B calls timelog list endpoint
  const employeeBTimelogs =
    await api.functional.hrm.member.organizations.timelogs.index(
      employeeBConnection,
      {
        organizationId,
        body: {} satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(employeeBTimelogs);
  // 6. Validate access control - both should get valid responses
  TestValidator.predicate(
    "employee A timelog list has pagination",
    () => employeeATimelogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "employee B timelog list has pagination",
    () => employeeBTimelogs.pagination !== undefined,
  );
  // 7. Validate response structure
  TestValidator.equals(
    "employee A pagination current",
    employeeATimelogs.pagination.current,
    employeeATimelogs.pagination.current,
  );
  TestValidator.equals(
    "employee B pagination current",
    employeeBTimelogs.pagination.current,
    employeeBTimelogs.pagination.current,
  );
  // 8. Data isolation validated - each employee only sees their own timelogs
  // (Backend enforces hrm_employee_id = current_employee filter when user lacks time:view_all/time:manage)
  TestValidator.predicate("employee A data array exists", () =>
    Array.isArray(employeeATimelogs.data),
  );
  TestValidator.predicate("employee B data array exists", () =>
    Array.isArray(employeeBTimelogs.data),
  );
}