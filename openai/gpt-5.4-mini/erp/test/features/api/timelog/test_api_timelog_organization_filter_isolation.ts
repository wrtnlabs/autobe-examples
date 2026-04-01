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

export async function test_api_timelog_organization_filter_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "workDateDesc" as const,
  } satisfies IErpHrmTimeTimelog.IRequest;
  const firstPage = await api.functional.erpHrmTime.member.timelogs.index(
    memberConnection,
    { body: baseRequest },
  );
  typia.assert(firstPage);
  for (const item of firstPage.data) typia.assert(item);
  TestValidator.equals(
    "pagination limit is preserved",
    firstPage.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.equals(
    "pagination current page is preserved",
    firstPage.pagination.current,
    baseRequest.page,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  if (firstPage.data.length > 0) {
    const projectId = firstPage.data[0]!.project.id;
    const projectFiltered =
      await api.functional.erpHrmTime.member.timelogs.index(memberConnection, {
        body: {
          ...baseRequest,
          projectId,
        } satisfies IErpHrmTimeTimelog.IRequest,
      });
    typia.assert(projectFiltered);
    for (const item of projectFiltered.data) typia.assert(item);
    TestValidator.predicate(
      "project filter keeps only the selected project",
      projectFiltered.data.every((item) => item.project.id === projectId),
    );
    TestValidator.equals(
      "project filter keeps pagination limit",
      projectFiltered.pagination.limit,
      baseRequest.limit,
    );
    const task = firstPage.data.find((item) => item.task !== null)?.task;
    if (task !== null && task !== undefined) {
      const taskFiltered =
        await api.functional.erpHrmTime.member.timelogs.index(
          memberConnection,
          {
            body: {
              ...baseRequest,
              projectId,
              taskId: task.id,
            } satisfies IErpHrmTimeTimelog.IRequest,
          },
        );
      typia.assert(taskFiltered);
      for (const item of taskFiltered.data) typia.assert(item);
      TestValidator.predicate(
        "task filter is constrained to the selected project",
        taskFiltered.data.every(
          (item) =>
            item.project.id === projectId &&
            item.task !== null &&
            item.task.id === task.id,
        ),
      );
    }
    const billableFiltered =
      await api.functional.erpHrmTime.member.timelogs.index(memberConnection, {
        body: {
          ...baseRequest,
          projectId,
          billable: true,
        } satisfies IErpHrmTimeTimelog.IRequest,
      });
    typia.assert(billableFiltered);
    for (const item of billableFiltered.data) typia.assert(item);
    TestValidator.predicate(
      "billable filter stays within the selected project",
      billableFiltered.data.every(
        (item) => item.project.id === projectId && item.billable,
      ),
    );
    const pagedFiltered = await api.functional.erpHrmTime.member.timelogs.index(
      memberConnection,
      {
        body: {
          ...baseRequest,
          projectId,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IErpHrmTimeTimelog.IRequest,
      },
    );
    typia.assert(pagedFiltered);
    for (const item of pagedFiltered.data) typia.assert(item);
    TestValidator.predicate(
      "paged filtered response stays within requested bounds",
      pagedFiltered.pagination.current === 2 ||
        pagedFiltered.pagination.pages < 2,
    );
    TestValidator.equals(
      "paged filtered response preserves limit",
      pagedFiltered.pagination.limit,
      baseRequest.limit,
    );
  }
}
