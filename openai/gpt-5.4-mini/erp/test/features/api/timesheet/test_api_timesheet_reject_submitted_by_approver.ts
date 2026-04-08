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
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_reject_submitted_by_approver(
  connection: api.IConnection,
): Promise<void> {
  const approverConnection: api.IConnection = { host: connection.host };
  const approver = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(approver);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: approver.token.access },
  };
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.httpError(
    "rejecting a non-existent submitted timesheet should fail",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.reject(
        memberConnection,
        {
          timesheetId,
          body: {
            rejectionReason: null,
          } satisfies IErpHrmTimeTimesheet.IReject,
        },
      );
    },
  );
  await TestValidator.httpError(
    "submitting a non-existent timesheet should fail",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.submit(
        memberConnection,
        {
          timesheetId,
        },
      );
    },
  );
  TestValidator.predicate(
    "rejection reason prepared",
    rejectionReason.length > 0,
  );
}
