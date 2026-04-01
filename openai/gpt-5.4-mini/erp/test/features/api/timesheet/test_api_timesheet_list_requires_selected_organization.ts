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

export async function test_api_timesheet_list_requires_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P4ssw0rd!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const noOrganizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  await TestValidator.httpError(
    "timesheet list requires selected organization context",
    [400, 401, 403],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.index(
        noOrganizationConnection,
        {
          body: {
            status: null,
            weekStartDateFrom: null,
            weekStartDateTo: null,
            weekEndDateFrom: null,
            weekEndDateTo: null,
            submittedAtFrom: null,
            submittedAtTo: null,
            reviewedAtFrom: null,
            reviewedAtTo: null,
            sort: null,
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeTimesheet.IRequest,
        },
      );
    },
  );
  const output = await api.functional.erpHrmTime.member.timesheets.index(
    noOrganizationConnection,
    {
      body: {
        status: null,
        weekStartDateFrom: null,
        weekStartDateTo: null,
        weekEndDateFrom: null,
        weekEndDateTo: null,
        submittedAtFrom: null,
        submittedAtTo: null,
        reviewedAtFrom: null,
        reviewedAtTo: null,
        sort: null,
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(output);
}
