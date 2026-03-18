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

export async function test_api_timelog_browsing_historical_records_for_inactive_project(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const authorized = await authorize_employee_join(employeeConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const workedOnA = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 2,
  ).toISOString();
  const workedOnB = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const workedOnC = new Date().toISOString();
  const descriptionA = `historical-${RandomGenerator.alphaNumeric(8)}`;
  const descriptionB = `historical-${RandomGenerator.alphaNumeric(8)}`;
  const descriptionC = `current-${RandomGenerator.alphaNumeric(8)}`;
  const firstTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn: workedOnA,
          durationMinutes: 30,
          description: descriptionA,
          billable: true,
        },
      },
    );
  typia.assert(firstTimelog);
  const secondTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: firstTimelog.project.id,
          hrmTimeTrackingTaskId: firstTimelog.task?.id ?? null,
          workedOn: workedOnB,
          durationMinutes: 45,
          description: descriptionB,
          billable: false,
        },
      },
    );
  typia.assert(secondTimelog);
  const thirdTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: firstTimelog.project.id,
          hrmTimeTrackingTaskId: firstTimelog.task?.id ?? null,
          workedOn: workedOnC,
          durationMinutes: 60,
          description: descriptionC,
          billable: true,
        },
      },
    );
  typia.assert(thirdTimelog);
  const searchBrowseInput = {
    search: descriptionA,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const searchBrowse =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: searchBrowseInput,
      },
    );
  typia.assert(searchBrowse);
  TestValidator.predicate(
    "search browse contains first timelog",
    ArrayUtil.has(searchBrowse.data, (row) => row.id === firstTimelog.id),
  );
  const billableBrowseInput = {
    billable: true,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const billableBrowse =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: billableBrowseInput,
      },
    );
  typia.assert(billableBrowse);
  TestValidator.predicate(
    "billable browse contains first timelog",
    ArrayUtil.has(billableBrowse.data, (row) => row.id === firstTimelog.id),
  );
  TestValidator.predicate(
    "billable browse contains third timelog",
    ArrayUtil.has(billableBrowse.data, (row) => row.id === thirdTimelog.id),
  );
  TestValidator.predicate(
    "billable browse excludes non billable second timelog",
    ArrayUtil.has(billableBrowse.data, (row) => row.id === secondTimelog.id) ===
      false,
  );
  const firstBrowseInput = {
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const firstBrowse =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: firstBrowseInput,
      },
    );
  typia.assert(firstBrowse);
  const secondBrowse =
    await api.functional.hrmTimeTracking.employee.timelogs.index(
      employeeConnection,
      {
        body: firstBrowseInput,
      },
    );
  typia.assert(secondBrowse);
  TestValidator.predicate(
    "first browse contains first timelog",
    ArrayUtil.has(firstBrowse.data, (row) => row.id === firstTimelog.id),
  );
  TestValidator.predicate(
    "first browse contains second timelog",
    ArrayUtil.has(firstBrowse.data, (row) => row.id === secondTimelog.id),
  );
  TestValidator.predicate(
    "first browse contains third timelog",
    ArrayUtil.has(firstBrowse.data, (row) => row.id === thirdTimelog.id),
  );
  TestValidator.predicate(
    "second browse contains first timelog",
    ArrayUtil.has(secondBrowse.data, (row) => row.id === firstTimelog.id),
  );
  const firstSummary = firstBrowse.data.find(
    (row) => row.id === firstTimelog.id,
  );
  const secondSummary = secondBrowse.data.find(
    (row) => row.id === firstTimelog.id,
  );
  TestValidator.predicate(
    "first summary exists in first browse",
    firstSummary !== undefined,
  );
  TestValidator.predicate(
    "first summary exists in second browse",
    secondSummary !== undefined,
  );
  const stableFirstSummary = firstSummary as IHrmTimeTrackingTimelog.ISummary;
  const stableSecondSummary = secondSummary as IHrmTimeTrackingTimelog.ISummary;
  TestValidator.equals(
    "browsing is read only for first timelog summary",
    stableSecondSummary,
    stableFirstSummary,
  );
}
