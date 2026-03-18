import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timers_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timers_create";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_list_personal_active_status(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createdTimer =
    await generate_random_hrm_time_tracking_employee_timers_create(
      employeeConnection,
      {
        body: {
          hrm_time_tracking_task_id: null,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdTimer);
  const request = {
    hrmTimeTrackingEmployeeId: authorized.id,
    taskAssigned: false,
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
  } satisfies IHrmTimeTrackingTimer.IRequest;
  const page = await api.functional.hrmTimeTracking.employee.timers.index(
    employeeConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals("current page is 1", page.pagination.current, 1);
  TestValidator.equals("limit is 10", page.pagination.limit, 10);
  TestValidator.equals("single active timer returned", page.data.length, 1);
  TestValidator.equals(
    "single matching record counted",
    page.pagination.records,
    1,
  );
  TestValidator.equals("single page returned", page.pagination.pages, 1);
  const listed = page.data[0]!;
  TestValidator.equals(
    "listed timer id matches created",
    listed.id,
    createdTimer.id,
  );
  TestValidator.equals(
    "listed employee matches caller",
    listed.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "listed employee matches created timer employee",
    listed.employee.id,
    createdTimer.employee.id,
  );
  TestValidator.equals(
    "listed organization matches created timer organization",
    listed.organization.id,
    createdTimer.organization.id,
  );
  TestValidator.equals(
    "listed project matches created timer project",
    listed.project.id,
    createdTimer.project.id,
  );
  TestValidator.equals("task remains null when unattached", listed.task, null);
  TestValidator.equals(
    "started_at matches created timer",
    listed.started_at,
    createdTimer.started_at,
  );
  TestValidator.equals(
    "description matches created timer",
    listed.description,
    createdTimer.description,
  );
  TestValidator.equals(
    "created_at matches created timer",
    listed.created_at,
    createdTimer.created_at,
  );
  TestValidator.equals(
    "updated_at matches created timer",
    listed.updated_at,
    createdTimer.updated_at,
  );
  TestValidator.equals(
    "employee summary email is stable",
    listed.employee.email,
    createdTimer.employee.email,
  );
  TestValidator.equals(
    "project summary name is stable",
    listed.project.name,
    createdTimer.project.name,
  );
}
