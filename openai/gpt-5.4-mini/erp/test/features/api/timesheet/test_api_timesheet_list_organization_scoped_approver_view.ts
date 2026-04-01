import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_organization_scoped_approver_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/erp-hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const approverConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const now: Date = new Date();
  const weekStart: Date = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd: Date = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const submittedFrom: Date = new Date(weekStart);
  submittedFrom.setUTCDate(weekStart.getUTCDate() - 7);
  const submittedTo: Date = new Date(weekEnd);
  submittedTo.setUTCDate(weekEnd.getUTCDate() + 7);
  const reviewedFrom: Date = new Date(weekStart);
  reviewedFrom.setUTCDate(weekStart.getUTCDate() - 14);
  const reviewedTo: Date = new Date(weekEnd);
  reviewedTo.setUTCDate(weekEnd.getUTCDate() + 14);
  const request: IErpHrmTimeTimesheet.IRequest = {
    status: "submitted",
    weekStartDateFrom: weekStart.toISOString(),
    weekStartDateTo: weekEnd.toISOString(),
    weekEndDateFrom: weekStart.toISOString(),
    weekEndDateTo: weekEnd.toISOString(),
    submittedAtFrom: submittedFrom.toISOString(),
    submittedAtTo: submittedTo.toISOString(),
    reviewedAtFrom: reviewedFrom.toISOString(),
    reviewedAtTo: reviewedTo.toISOString(),
    sort: "-submittedAt",
    page: 1,
    limit: 20,
  };
  const output = await api.functional.erpHrmTime.member.timesheets.index(
    approverConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is first page",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is requested value",
    output.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "all results match the requested week start range",
    output.data.every(
      (item) =>
        item.weekStartDate >= request.weekStartDateFrom! &&
        item.weekStartDate <= request.weekStartDateTo!,
    ),
  );
  TestValidator.predicate(
    "all results match the requested week end range",
    output.data.every(
      (item) =>
        item.weekEndDate >= request.weekEndDateFrom! &&
        item.weekEndDate <= request.weekEndDateTo!,
    ),
  );
  TestValidator.predicate(
    "submitted timestamp filters are respected when present",
    output.data.every(
      (item) =>
        item.submittedAt === null ||
        (item.submittedAt >= request.submittedAtFrom! &&
          item.submittedAt <= request.submittedAtTo!),
    ),
  );
  TestValidator.predicate(
    "reviewed timestamp filters are respected when present",
    output.data.every(
      (item) =>
        item.reviewedAt === null ||
        (item.reviewedAt >= request.reviewedAtFrom! &&
          item.reviewedAt <= request.reviewedAtTo!),
    ),
  );
}
