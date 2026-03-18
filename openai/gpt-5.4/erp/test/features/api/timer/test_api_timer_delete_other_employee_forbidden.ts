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

export async function test_api_timer_delete_other_employee_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_employee_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(ownerAuth);
  const otherEmployeeConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_employee_join(otherEmployeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(otherAuth);
  const timer = await generate_random_hrm_time_tracking_employee_timers_create(
    ownerConnection,
    {},
  );
  typia.assert(timer);
  const timerSnapshot = {
    id: timer.id,
    organizationId: timer.organization.id,
    employeeId: timer.employee.id,
    projectId: timer.project.id,
    taskId: timer.task?.id ?? null,
    startedAt: timer.started_at,
    description: timer.description,
    createdAt: timer.created_at,
    updatedAt: timer.updated_at,
    deletedAt: timer.deleted_at,
  };
  TestValidator.equals(
    "timer belongs to owner employee",
    timer.employee.id,
    ownerAuth.id,
  );
  TestValidator.notEquals(
    "other employee differs from owner",
    otherAuth.id,
    ownerAuth.id,
  );
  await TestValidator.httpError(
    "other employee cannot delete owner's timer",
    403,
    async () => {
      await api.functional.hrmTimeTracking.employee.timers.erase(
        otherEmployeeConnection,
        {
          timerId: timer.id,
        },
      );
    },
  );
  TestValidator.equals(
    "timer id unchanged after failed delete",
    timer.id,
    timerSnapshot.id,
  );
  TestValidator.equals(
    "timer organization unchanged after failed delete",
    timer.organization.id,
    timerSnapshot.organizationId,
  );
  TestValidator.equals(
    "timer employee unchanged after failed delete",
    timer.employee.id,
    timerSnapshot.employeeId,
  );
  TestValidator.equals(
    "timer project unchanged after failed delete",
    timer.project.id,
    timerSnapshot.projectId,
  );
  TestValidator.equals(
    "timer task unchanged after failed delete",
    timer.task?.id ?? null,
    timerSnapshot.taskId,
  );
  TestValidator.equals(
    "timer started_at unchanged after failed delete",
    timer.started_at,
    timerSnapshot.startedAt,
  );
  TestValidator.equals(
    "timer description unchanged after failed delete",
    timer.description,
    timerSnapshot.description,
  );
  TestValidator.equals(
    "timer created_at unchanged after failed delete",
    timer.created_at,
    timerSnapshot.createdAt,
  );
  TestValidator.equals(
    "timer updated_at unchanged after failed delete",
    timer.updated_at,
    timerSnapshot.updatedAt,
  );
  TestValidator.equals(
    "timer deleted_at unchanged after failed delete",
    timer.deleted_at,
    timerSnapshot.deletedAt,
  );
}
