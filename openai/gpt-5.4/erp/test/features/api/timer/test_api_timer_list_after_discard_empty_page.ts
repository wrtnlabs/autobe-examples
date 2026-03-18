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

export async function test_api_timer_list_after_discard_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!" satisfies string as string &
      tags.Format<"password">,
    href: "https://example.com/hrm/timers" satisfies string as string &
      tags.Format<"uri">,
    referrer: "https://example.com/hrm" satisfies string as string &
      tags.Format<"uri">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const authorized = await authorize_employee_join(employeeConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const timer = await generate_random_hrm_time_tracking_employee_timers_create(
    employeeConnection,
    {},
  );
  typia.assert(timer);
  await api.functional.hrmTimeTracking.employee.timers.erase(
    employeeConnection,
    {
      timerId: timer.id,
    },
  );
  const pageNumber = 1 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limitNumber = 10 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const request = {
    hrmTimeTrackingEmployeeId: authorized.id,
    hrmTimeTrackingProjectId: timer.project.id,
    hrmTimeTrackingTaskId: timer.task?.id,
    taskAssigned: timer.task !== null,
    search: timer.description ?? undefined,
    page: pageNumber,
    limit: limitNumber,
    sortBy: "startedAt",
    sortDirection: "desc",
  } satisfies IHrmTimeTrackingTimer.IRequest;
  const page = await api.functional.hrmTimeTracking.employee.timers.index(
    employeeConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals("current page preserved", page.pagination.current, 1);
  TestValidator.equals("page limit preserved", page.pagination.limit, 10);
  TestValidator.equals("discarded timer list is empty", page.data.length, 0);
  TestValidator.equals(
    "no active timer records remain",
    page.pagination.records,
    0,
  );
  TestValidator.equals("no result pages remain", page.pagination.pages, 0);
  TestValidator.predicate(
    "discarded timer id excluded from results",
    page.data.every((item) => item.id !== timer.id),
  );
}
