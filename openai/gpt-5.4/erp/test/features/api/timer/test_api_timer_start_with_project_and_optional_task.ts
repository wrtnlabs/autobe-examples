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

export async function test_api_timer_start_with_project_and_optional_task(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const timer = await generate_random_hrm_time_tracking_employee_timers_create(
    employeeConnection,
    {},
  );
  typia.assert(timer);
  TestValidator.equals(
    "timer belongs to authenticated employee",
    timer.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timer employee email matches authenticated employee",
    timer.employee.email,
    authorized.email,
  );
  TestValidator.equals(
    "timer organization matches authenticated organization",
    timer.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "timer project organization matches timer organization",
    timer.project.organization.id,
    timer.organization.id,
  );
  TestValidator.notEquals("timer project is populated", timer.project.id, "");
  TestValidator.equals("active timer is not deleted", timer.deleted_at, null);
  TestValidator.predicate(
    "started at is available for active timer views",
    timer.started_at.length > 0,
  );
  TestValidator.predicate(
    "created at is available",
    timer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at is available",
    timer.updated_at.length > 0,
  );
  TestValidator.predicate(
    "optional task is either absent or has an identifier",
    timer.task === null || timer.task.id.length > 0,
  );
}
