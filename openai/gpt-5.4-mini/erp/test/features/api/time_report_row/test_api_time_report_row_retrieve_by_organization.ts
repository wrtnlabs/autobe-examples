import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_row_retrieve_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const memberSession: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const organizationId: string = typia.random<string & tags.Format<"uuid">>();
  const timeReportRowId: string = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.erpHrmTime.member.organizations.timeReportRows.at(
      memberSession,
      {
        organizationId,
        timeReportRowId,
      },
    );
  typia.assert(output);
  TestValidator.equals("time report row id", output.id, timeReportRowId);
  TestValidator.equals(
    "organization scoped row id",
    output.organization.id,
    organizationId,
  );
  TestValidator.predicate(
    "row is active",
    output.deletedAt === null || output.deletedAt !== null,
  );
  TestValidator.predicate(
    "logged minutes are non-negative",
    output.loggedMinutes >= 0,
  );
  TestValidator.predicate(
    "logged hours are non-negative",
    output.loggedHours >= 0,
  );
  TestValidator.predicate(
    "createdAt is not later than updatedAt or equal",
    new Date(output.createdAt).getTime() <=
      new Date(output.updatedAt).getTime(),
  );
}
