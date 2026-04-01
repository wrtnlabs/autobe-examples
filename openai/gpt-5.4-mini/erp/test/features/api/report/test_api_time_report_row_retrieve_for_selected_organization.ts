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
import type { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_row_retrieve_for_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const selectedOrganizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const timeReportRowId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "time report row retrieval is scoped to the selected organization",
    [404],
    async () => {
      const row =
        await api.functional.erpHrmTime.member.reports.time_report_rows.at(
          selectedOrganizationConnection,
          {
            timeReportRowId,
          },
        );
      typia.assert(row);
      TestValidator.equals("time report row id", row.id, timeReportRowId);
      TestValidator.predicate(
        "organization summary exists",
        () => row.organization !== null,
      );
      TestValidator.predicate(
        "billable flag is boolean",
        () => typeof row.billable === "boolean",
      );
      TestValidator.predicate(
        "logged minutes non-negative",
        () => row.loggedMinutes >= 0,
      );
      TestValidator.predicate(
        "logged hours non-negative",
        () => row.loggedHours >= 0,
      );
      TestValidator.predicate(
        "report date exists",
        () => row.reportDate.length > 0,
      );
      TestValidator.predicate(
        "created timestamp exists",
        () => row.created_at.length > 0,
      );
      TestValidator.predicate(
        "updated timestamp exists",
        () => row.updated_at.length > 0,
      );
      TestValidator.predicate(
        "deleted timestamp is nullable",
        () => row.deleted_at === null || row.deleted_at.length > 0,
      );
      if (row.employee !== null) {
        typia.assert(row.employee);
      }
      if (row.project !== null) {
        typia.assert(row.project);
      }
      if (row.task !== null) {
        typia.assert(row.task);
      }
    },
  );
}
