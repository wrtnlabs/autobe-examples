import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";

export async function test_api_timelogs_list_sort_pagination_and_soft_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Pass_${RandomGenerator.alphabets(12)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: `org_${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const baseWorkDate = new Date();
  const workDateFrom = new Date(
    baseWorkDate.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const workDateTo = new Date(
    baseWorkDate.getTime() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // First timelog will also provide a valid projectId via response DTO
  const firstTimelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: new Date(baseWorkDate.getTime()).toISOString(),
          duration_minutes: 30,
          note: RandomGenerator.paragraph({ sentences: 1 }),
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: null,
          start_time: null,
          end_time: null,
        },
      },
    );
  typia.assert(firstTimelog);
  const projectId = firstTimelog.project.id;
  const timelogs: IErpHrmTimeTrackingTimelog.ISummary[] = [
    // types: ISummary differs from entity; but response from generator is IErpHrmTimeTrackingTimelog (entity)
  ] as unknown as IErpHrmTimeTrackingTimelog.ISummary[];
  const created1 = firstTimelog;
  const moreCreated: IErpHrmTimeTrackingTimelog[] = [created1];
  for (const offsetDays of [1, 2, 3]) {
    const created =
      await generate_random_erp_hrm_time_tracking_member_timelogs_create(
        memberConnection,
        {
          body: {
            work_date: new Date(
              baseWorkDate.getTime() + offsetDays * 24 * 60 * 60 * 1000,
            ).toISOString(),
            duration_minutes: 20 + offsetDays * 5,
            note: RandomGenerator.paragraph({ sentences: 1 }),
            erpHrmTimeTrackingProjectId: projectId,
            erpHrmTimeTrackingTaskId: null,
            erpHrmTimeTrackingTimesheetId: null,
            start_time: null,
            end_time: null,
          },
        },
      );
    typia.assert(created);
    moreCreated.push(created);
  }
  // page 1
  const page1 = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
        sortBy: "createdAt",
        sortOrder: "asc",
        workDateFrom,
        workDateTo,
        projectId,
        taskId: null,
        employeeId: null,
        timesheetId: null,
      } satisfies IErpHrmTimeTrackingTimelog.IRequest,
    },
  );
  typia.assert(page1);
  // page 2
  const page2 = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
        sortBy: "createdAt",
        sortOrder: "asc",
        workDateFrom,
        workDateTo,
        projectId,
        taskId: null,
        employeeId: null,
        timesheetId: null,
      } satisfies IErpHrmTimeTrackingTimelog.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("pagination limit page1", page1.pagination.limit, 2);
  TestValidator.equals("pagination limit page2", page2.pagination.limit, 2);
  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      "createdAt asc within page1",
      new Date(page1.data[i - 1].created_at).getTime() <=
        new Date(page1.data[i].created_at).getTime(),
    );
  }
  for (let i = 1; i < page2.data.length; i++) {
    TestValidator.predicate(
      "createdAt asc within page2",
      new Date(page2.data[i - 1].created_at).getTime() <=
        new Date(page2.data[i].created_at).getTime(),
    );
  }
  const page1Ids = page1.data.map((t) => t.id);
  const page2Ids = page2.data.map((t) => t.id);
  const combinedIds = [...page1Ids, ...page2Ids];
  const uniqueCombinedIds = new Set(combinedIds);
  TestValidator.predicate(
    "no duplicate IDs across page1+page2",
    uniqueCombinedIds.size === combinedIds.length,
  );
  // large page to validate union/order
  const allPage = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "asc",
        workDateFrom,
        workDateTo,
        projectId,
        taskId: null,
        employeeId: null,
        timesheetId: null,
      } satisfies IErpHrmTimeTrackingTimelog.IRequest,
    },
  );
  typia.assert(allPage);
  const allIds = allPage.data.map((t) => t.id);
  const expectedFirstNIds = allIds.slice(
    0,
    page1.data.length + page2.data.length,
  );
  TestValidator.equals(
    "page1+page2 IDs match first records of large page",
    combinedIds,
    expectedFirstNIds,
  );
  // soft delete the latest created among our created timelogs
  const toDelete = [...moreCreated].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[moreCreated.length - 1];
  await api.functional.erpHrmTimeTracking.member.timelogs.erase(
    memberConnection,
    { timelogId: toDelete.id },
  );
  const afterDelete =
    await api.functional.erpHrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "asc",
          workDateFrom,
          workDateTo,
          projectId,
          taskId: null,
          employeeId: null,
          timesheetId: null,
        } satisfies IErpHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(afterDelete);
  TestValidator.predicate(
    "deleted timelog id excluded",
    !afterDelete.data.some((t) => t.id === toDelete.id),
  );
  const allIdsAfter = afterDelete.data.map((t) => t.id);
  TestValidator.notEquals(
    "records decreased after deletion",
    allIds.length,
    allIdsAfter.length,
  );
  TestValidator.predicate(
    "deleted timelog not present in records",
    !allIdsAfter.includes(toDelete.id),
  );
}
