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
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_update_rejects_other_employee_timer(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const ownerAuth = await authorize_employee_join(ownerConnection, {
    body: ownerJoin,
  });
  typia.assert(ownerAuth);
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  const originalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timer = await generate_random_hrm_time_tracking_employee_timers_create(
    ownerConnection,
    {
      body: {
        hrm_time_tracking_project_id: project.id,
        hrm_time_tracking_task_id: null,
        description: originalDescription,
      },
    },
  );
  typia.assert(timer);
  const baselineTimerId = timer.id;
  const baselineOrganizationId = timer.organization.id;
  const baselineEmployeeId = timer.employee.id;
  const baselineProjectId = timer.project.id;
  const baselineTask = timer.task;
  const baselineDescription = timer.description;
  const baselineStartedAt = timer.started_at;
  const baselineDeletedAt = timer.deleted_at;
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const intruderAuth = await authorize_employee_join(intruderConnection, {
    body: intruderJoin,
  });
  typia.assert(intruderAuth);
  const unauthorizedUpdate = {
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHrmTimeTrackingTimer.IUpdate;
  await TestValidator.httpError(
    "other employee cannot update owner timer",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.employee.timers.update(
        intruderConnection,
        {
          timerId: timer.id,
          body: unauthorizedUpdate,
        },
      );
    },
  );
  TestValidator.equals("timer id unchanged", timer.id, baselineTimerId);
  TestValidator.equals(
    "timer organization unchanged",
    timer.organization.id,
    baselineOrganizationId,
  );
  TestValidator.equals(
    "timer owner unchanged",
    timer.employee.id,
    baselineEmployeeId,
  );
  TestValidator.equals(
    "timer project unchanged",
    timer.project.id,
    baselineProjectId,
  );
  TestValidator.equals("timer task unchanged", timer.task, baselineTask);
  TestValidator.equals(
    "timer description unchanged",
    timer.description,
    baselineDescription,
  );
  TestValidator.equals(
    "timer started_at unchanged",
    timer.started_at,
    baselineStartedAt,
  );
  TestValidator.equals(
    "timer deleted_at unchanged",
    timer.deleted_at,
    baselineDeletedAt,
  );
  TestValidator.notEquals(
    "intruder is different employee",
    intruderAuth.id,
    baselineEmployeeId,
  );
}
