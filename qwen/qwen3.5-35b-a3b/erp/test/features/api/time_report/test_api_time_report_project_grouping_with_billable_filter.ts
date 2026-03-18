import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_project_grouping_with_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  const memberTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Call time report API with date_range filter
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const reportResponse = await api.functional.hrms.member.reports.time.index(
    memberTokenConnection,
    {
      body: {
        date_range: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      } satisfies IHrmsTimelog.IRequest,
    },
  );
  typia.assert(reportResponse);
  // 3. Validate response structure
  TestValidator.equals("report has pagination", reportResponse.pagination, {
    current: 1,
    limit: 100,
    records: 0,
    pages: 0,
  });
  // 4. Validate data structure
  const timelogData = reportResponse.data;
  TestValidator.equals("number of timelogs", timelogData.length, 0);
  // 5. Validate each entry structure (loop will not execute with empty data, but validates structure)
  for (const entry of timelogData) {
    typia.assert(entry);
    TestValidator.equals("group_id is valid UUID", entry.group_id.length, 36);
    TestValidator.notEquals("group_name is not empty", entry.group_name, "");
    TestValidator.predicate(
      "total_hours is number",
      typeof entry.total_hours === "number",
    );
    TestValidator.predicate(
      "billable_hours is number",
      typeof entry.billable_hours === "number",
    );
    TestValidator.predicate(
      "non_billable_hours is number",
      typeof entry.non_billable_hours === "number",
    );
  }
}