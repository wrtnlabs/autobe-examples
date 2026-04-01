import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that a manager with time:view_all permission can view timelogs for all employees.
 *
 * This test verifies:
 * 1. Manager can view timelogs from all employees without employee_id filter
 * 2. Manager can filter timelogs by specific employee_id
 * 3. Each timelog includes employee information identifying who logged the time
 * 4. Regular employee can only see their own timelogs
 */
export async function test_api_timelog_list_manager_view_all_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create regular employee account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Create timelog for manager
  const managerTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      managerConnection,
      {
        body: {
          date: new Date().toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        },
      },
    );
  typia.assert(managerTimelog);
  // 4. Create timelog for employee
  const employeeTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      employeeConnection,
      {
        body: {
          date: new Date().toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        },
      },
    );
  typia.assert(employeeTimelog);
  // 5. Manager queries all timelogs (without employee_id filter)
  const managerAllTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(managerConnection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(managerAllTimelogs);
  // 6. Verify manager sees timelogs from multiple employees
  TestValidator.predicate("manager sees multiple employees' timelogs", () => {
    const employeeIds = new Set(
      managerAllTimelogs.data.map((t) => t.employee.id),
    );
    return employeeIds.size >= 2;
  });
  // 7. Manager queries timelogs filtered by employee_id
  const managerFilteredTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(managerConnection, {
      body: {
        employee_id: employeeTimelog.employee.id,
        page: 1,
        limit: 50,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(managerFilteredTimelogs);
  // 8. Verify filtered results only contain specified employee's timelogs
  TestValidator.predicate(
    "filtered timelogs belong to specified employee",
    () => {
      return managerFilteredTimelogs.data.every(
        (t) => t.employee.id === employeeTimelog.employee.id,
      );
    },
  );
  // 9. Regular employee queries their own timelogs
  const employeeTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(employeeConnection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(employeeTimelogs);
  // 10. Verify employee only sees their own timelogs
  TestValidator.predicate("employee sees only own timelogs", () => {
    return employeeTimelogs.data.every(
      (t) => t.employee.id === employeeTimelog.employee.id,
    );
  });
  // 11. Verify manager can see employee's timelog in unfiltered results
  TestValidator.predicate(
    "manager sees employee timelog in all results",
    () => {
      return managerAllTimelogs.data.some((t) => t.id === employeeTimelog.id);
    },
  );
  // 12. Verify manager can see their own timelog in unfiltered results
  TestValidator.predicate("manager sees own timelog in all results", () => {
    return managerAllTimelogs.data.some((t) => t.id === managerTimelog.id);
  });
}
