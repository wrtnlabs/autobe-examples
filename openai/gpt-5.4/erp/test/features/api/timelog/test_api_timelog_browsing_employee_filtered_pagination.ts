import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_browsing_employee_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/hrm/timelogs",
      referrer: "https://example.com/hrm",
      ip: "127.0.0.1",
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const createdTimelogs: IHrmTimeTrackingTimelog[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const created =
        await generate_random_hrm_time_tracking_employee_timelogs_create(
          employeeConnection,
          {
            body: {
              workedOn: new Date(
                Date.now() - index * 24 * 60 * 60 * 1000,
              ).toISOString(),
              durationMinutes: 30 + index * 15,
              description: `employee timelog pagination ${index} ${RandomGenerator.paragraph({ sentences: 3 })}`,
              billable: index % 2 === 0,
            },
          },
        );
      typia.assert(created);
      return created;
    });
  TestValidator.equals("created timelog count", createdTimelogs.length, 5);
  const createdIds = createdTimelogs.map((timelog) => timelog.id);
  const organizationId = authorized.role.organization.id;
  const target =
    createdTimelogs.find((timelog) => timelog.task !== null) ??
    createdTimelogs[0];
  const searchTerm =
    target.description !== null && target.description.length !== 0
      ? target.description.split(" ")[0]
      : undefined;
  const firstPageRequest = {
    page: 1,
    limit: 2,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page data within limit",
    firstPage.data.length <= 2,
  );
  TestValidator.predicate(
    "first page records covers returned data",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  firstPage.data.forEach((summary) => {
    TestValidator.equals(
      "first page summary belongs to authenticated employee",
      summary.employee.id,
      authorized.id,
    );
    TestValidator.equals(
      "first page summary belongs to current organization",
      summary.project.organization.id,
      organizationId,
    );
    TestValidator.predicate(
      "first page summary was created in setup",
      createdIds.includes(summary.id),
    );
  });
  const secondPageRequest = {
    page: 2,
    limit: 2,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const secondPage =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.predicate(
    "second page data within limit",
    secondPage.data.length <= 2,
  );
  const firstPageIds = firstPage.data.map((summary) => summary.id);
  secondPage.data.forEach((summary) => {
    TestValidator.equals(
      "second page summary belongs to authenticated employee",
      summary.employee.id,
      authorized.id,
    );
    TestValidator.equals(
      "second page summary belongs to current organization",
      summary.project.organization.id,
      organizationId,
    );
    TestValidator.predicate(
      "second page summary was created in setup",
      createdIds.includes(summary.id),
    );
    TestValidator.predicate(
      "pagination pages do not duplicate ids across first and second page",
      firstPageIds.includes(summary.id) === false,
    );
  });
  const filteredRequest = {
    worked_from: target.worked_on,
    worked_to: target.worked_on,
    hrm_time_tracking_project_id: target.project.id,
    hrm_time_tracking_task_id: target.task?.id,
    billable: target.billable,
    search: searchTerm,
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const filteredPage =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered page current",
    filteredPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered page limit",
    filteredPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered results are subset of created timelogs",
    filteredPage.data.every((summary) => createdIds.includes(summary.id)),
  );
  filteredPage.data.forEach((summary) => {
    TestValidator.equals(
      "filtered summary belongs to authenticated employee",
      summary.employee.id,
      authorized.id,
    );
    TestValidator.equals(
      "filtered summary belongs to current organization",
      summary.project.organization.id,
      organizationId,
    );
    TestValidator.equals(
      "filtered summary billable matches",
      summary.billable,
      target.billable,
    );
    TestValidator.equals(
      "filtered summary project matches",
      summary.project.id,
      target.project.id,
    );
    TestValidator.predicate(
      "filtered summary worked_on within requested range",
      summary.worked_on >= target.worked_on &&
        summary.worked_on <= target.worked_on,
    );
    if (target.task !== null) {
      TestValidator.equals(
        "filtered summary task matches",
        summary.task?.id,
        target.task.id,
      );
    }
    if (searchTerm !== undefined) {
      TestValidator.predicate(
        "filtered summary description contains search term",
        (summary.description ?? "").includes(searchTerm),
      );
    }
  });
  const originalSortedIds = [...createdIds].sort();
  const currentSortedIds = createdTimelogs.map((timelog) => timelog.id).sort();
  TestValidator.equals(
    "created ids remain unchanged after browsing",
    currentSortedIds,
    originalSortedIds,
  );
}
