import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
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

export async function test_api_timelogs_list_by_work_date_and_project(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.name(2)
    .replace(/\s+/g, "")
    .toLowerCase()}+${RandomGenerator.alphabets(6)}@example.com` satisfies string &
    tags.Format<"email">;
  const password = `Pw-${RandomGenerator.alphabets(12)}-!`;
  const join = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: `${RandomGenerator.name(2)} Org`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 1);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const request: IErpHrmTimeTrackingTimelog.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "workDate",
    sortOrder: "asc",
    workDateFrom: from.toISOString() satisfies
      | (string & tags.Format<"date-time">)
      | (string & tags.Format<"date">)
      | null,
    workDateTo: to.toISOString() satisfies
      | (string & tags.Format<"date-time">)
      | (string & tags.Format<"date">)
      | null,
    projectId,
    taskId: null,
    employeeId: null,
    timesheetId: null,
  };
  const page1 = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    { body: request },
  );
  typia.assert(page1);
  TestValidator.equals(
    "records count empty contract",
    page1.pagination.records === 0,
    page1.data.length === 0,
  );
  if (page1.data.length > 0) {
    await ArrayUtil.asyncForEach(page1.data, async (item) => {
      typia.assert(item);
      TestValidator.equals(
        "timelog project id matches filter",
        item.project.id,
        projectId,
      );
      TestValidator.equals("active timelog only", item.deleted_at, null);
      const itemTime = new Date(item.work_date);
      TestValidator.predicate(
        "work_date within range",
        itemTime.getTime() >= from.getTime() &&
          itemTime.getTime() <= to.getTime(),
      );
    });
  }
  const request2: IErpHrmTimeTrackingTimelog.IRequest = {
    ...request,
    page: 2,
    limit: 5,
  };
  const page2 = await api.functional.erpHrmTimeTracking.member.timelogs.index(
    memberConnection,
    { body: request2 },
  );
  typia.assert(page2);
  if (page2.data.length === 0) {
    TestValidator.equals(
      "records is 0 implies empty pages",
      page2.pagination.records,
      0,
    );
    TestValidator.equals(
      "pages is 0 when records is 0",
      page2.pagination.pages,
      0,
    );
  } else {
    await ArrayUtil.asyncForEach(page2.data, async (item) => {
      TestValidator.equals(
        "timelog project id matches filter (page2)",
        item.project.id,
        projectId,
      );
      TestValidator.equals(
        "active timelog only (page2)",
        item.deleted_at,
        null,
      );
      const itemTime = new Date(item.work_date);
      TestValidator.predicate(
        "work_date within range (page2)",
        itemTime.getTime() >= from.getTime() &&
          itemTime.getTime() <= to.getTime(),
      );
    });
  }
}
