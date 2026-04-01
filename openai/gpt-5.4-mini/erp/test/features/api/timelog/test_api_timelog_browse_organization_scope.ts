import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_browse_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const firstPage = await api.functional.erpHrmTime.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "workDateDesc",
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current should start from 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should respect requested size",
    firstPage.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "result size should not exceed page limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "each timelog should include linked member, project, and optional task summaries",
    firstPage.data.every(
      (timelog) => timelog.member !== null && timelog.project !== null && true,
    ),
  );
  if (firstPage.data.length > 0) {
    for (let i = 1; i < firstPage.data.length; i += 1) {
      const previous = firstPage.data[i - 1];
      const current = firstPage.data[i];
      TestValidator.predicate(
        "workDateDesc sorting should be descending with stable tie-breaks",
        previous.workDate > current.workDate ||
          (previous.workDate === current.workDate && previous.id >= current.id),
      );
    }
    const projectId = firstPage.data[0].project.id;
    const billableFlag = firstPage.data[0].billable;
    const workDate = firstPage.data[0].workDate.slice(0, 10);
    const taskId = firstPage.data[0].task?.id;
    const projectFiltered =
      await api.functional.erpHrmTime.member.timelogs.index(memberConnection, {
        body: {
          projectId,
          page: 1,
          limit: 20,
          sort: "createdAtDesc",
        } satisfies IErpHrmTimeTimelog.IRequest,
      });
    typia.assert(projectFiltered);
    TestValidator.predicate(
      "project filter should return only matching project timelogs",
      projectFiltered.data.every((timelog) => timelog.project.id === projectId),
    );
    const billableFiltered =
      await api.functional.erpHrmTime.member.timelogs.index(memberConnection, {
        body: {
          billable: billableFlag,
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeTimelog.IRequest,
      });
    typia.assert(billableFiltered);
    TestValidator.predicate(
      "billable filter should respect requested flag",
      billableFiltered.data.every(
        (timelog) => timelog.billable === billableFlag,
      ),
    );
    const dateFiltered = await api.functional.erpHrmTime.member.timelogs.index(
      memberConnection,
      {
        body: {
          workDateFrom: workDate,
          workDateTo: workDate,
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeTimelog.IRequest,
      },
    );
    typia.assert(dateFiltered);
    TestValidator.predicate(
      "workDate range filter should constrain results to the requested day",
      dateFiltered.data.every(
        (timelog) => timelog.workDate.slice(0, 10) === workDate,
      ),
    );
    if (taskId !== undefined) {
      const taskFiltered =
        await api.functional.erpHrmTime.member.timelogs.index(
          memberConnection,
          {
            body: {
              projectId,
              taskId,
              page: 1,
              limit: 20,
            } satisfies IErpHrmTimeTimelog.IRequest,
          },
        );
      typia.assert(taskFiltered);
      TestValidator.predicate(
        "task filter should return only timelogs linked to the selected task",
        taskFiltered.data.every((timelog) => timelog.task?.id === taskId),
      );
    }
  }
}
