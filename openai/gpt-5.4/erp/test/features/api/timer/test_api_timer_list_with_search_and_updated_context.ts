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

export async function test_api_timer_list_with_search_and_updated_context(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const created =
    await generate_random_hrm_time_tracking_employee_timers_create(
      employeeConnection,
      {},
    );
  typia.assert(created);
  const updatedDescription = [
    "updated",
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.paragraph({ sentences: 3 }),
  ].join(" ");
  const searchKeyword = updatedDescription.slice(0, 12).trim() || "updated";
  const updateBody = {
    project_id: created.project.id,
    description: updatedDescription,
  } satisfies IHrmTimeTrackingTimer.IUpdate;
  const updated = await api.functional.hrmTimeTracking.employee.timers.update(
    employeeConnection,
    {
      timerId: created.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "timer id preserved after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "started_at preserved after update",
    updated.started_at,
    created.started_at,
  );
  TestValidator.equals(
    "employee preserved after update",
    updated.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "project preserved after update",
    updated.project.id,
    created.project.id,
  );
  TestValidator.equals(
    "updated description applied",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "task preserved after update when present or absent",
    updated.task?.id ?? null,
    created.task?.id ?? null,
  );
  const request = {
    hrmTimeTrackingEmployeeId: authorized.id,
    hrmTimeTrackingProjectId: updated.project.id,
    taskAssigned: updated.task !== null,
    search: searchKeyword,
    page: 1,
    limit: 10,
    sortBy: "updatedAt",
    sortDirection: "desc",
  } satisfies IHrmTimeTrackingTimer.IRequest;
  const page = await api.functional.hrmTimeTracking.employee.timers.index(
    employeeConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals("requested page current", page.pagination.current, 1);
  TestValidator.equals("requested page limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "list contains at least one active timer",
    page.data.length >= 1,
  );
  TestValidator.predicate(
    "all listed timers belong to the authenticated employee",
    page.data.every((timer) => timer.employee.id === authorized.id),
  );
  TestValidator.predicate(
    "all listed timers match requested project",
    page.data.every((timer) => timer.project.id === updated.project.id),
  );
  TestValidator.predicate(
    "all listed timers respect requested taskAssigned filter",
    page.data.every(
      (timer) => (timer.task !== null) === (updated.task !== null),
    ),
  );
  TestValidator.predicate(
    "all listed timers match description search keyword",
    page.data.every(
      (timer) =>
        timer.description !== null &&
        timer.description.toLowerCase().includes(searchKeyword.toLowerCase()),
    ),
  );
  const matched = page.data.filter((timer) => timer.id === updated.id);
  TestValidator.equals("updated timer returned once", matched.length, 1);
  const listed = typia.assert<IHrmTimeTrackingTimer.ISummary>(matched[0]!);
  TestValidator.equals(
    "listed timer id matches updated",
    listed.id,
    updated.id,
  );
  TestValidator.equals(
    "listed timer employee matches updated",
    listed.employee.id,
    updated.employee.id,
  );
  TestValidator.equals(
    "listed timer project matches updated",
    listed.project.id,
    updated.project.id,
  );
  TestValidator.equals(
    "listed timer task matches updated",
    listed.task?.id ?? null,
    updated.task?.id ?? null,
  );
  TestValidator.equals(
    "listed timer description matches updated",
    listed.description,
    updated.description,
  );
  TestValidator.equals(
    "listed timer started_at matches updated",
    listed.started_at,
    updated.started_at,
  );
  const ids = page.data.map((timer) => timer.id);
  const uniqueIds = new Set(ids);
  TestValidator.equals(
    "active timer list has unique timer ids",
    uniqueIds.size,
    ids.length,
  );
  const pageAfterRead =
    await api.functional.hrmTimeTracking.employee.timers.index(
      employeeConnection,
      {
        body: request,
      },
    );
  typia.assert(pageAfterRead);
  const listedAfterReadCandidate = pageAfterRead.data.find(
    (timer) => timer.id === updated.id,
  );
  TestValidator.predicate(
    "listed timer remains available after repeated read",
    listedAfterReadCandidate !== undefined,
  );
  const listedAfterRead = typia.assert<IHrmTimeTrackingTimer.ISummary>(
    listedAfterReadCandidate!,
  );
  TestValidator.equals(
    "read-only list keeps timer id stable",
    listedAfterRead.id,
    updated.id,
  );
  TestValidator.equals(
    "read-only list keeps started_at stable",
    listedAfterRead.started_at,
    updated.started_at,
  );
  TestValidator.equals(
    "read-only list keeps project stable",
    listedAfterRead.project.id,
    updated.project.id,
  );
  TestValidator.equals(
    "read-only list keeps task stable",
    listedAfterRead.task?.id ?? null,
    updated.task?.id ?? null,
  );
  TestValidator.equals(
    "read-only list keeps description stable",
    listedAfterRead.description,
    updated.description,
  );
}
