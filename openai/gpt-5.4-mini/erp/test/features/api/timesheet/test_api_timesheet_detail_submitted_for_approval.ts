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

export async function test_api_timesheet_detail_submitted_for_approval(
  connection: api.IConnection,
): Promise<void> {
  const approverConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  const approver = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/member/join/approver",
      referrer: "https://example.com/erpHrmTime/member/join",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(approver);
  const otherMember = await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/member/join/other",
      referrer: "https://example.com/erpHrmTime/member/join",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherMember);
  const timesheet = await api.functional.erpHrmTime.member.timesheets.at(
    approverConnection,
    {
      timesheetId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(timesheet);
  TestValidator.predicate(
    "timesheet has employee owner",
    () => timesheet.employee !== null && timesheet.employee !== undefined,
  );
  TestValidator.predicate(
    "timesheet has week start",
    () => timesheet.weekStartDate.length > 0,
  );
  TestValidator.predicate(
    "timesheet has week end",
    () => timesheet.weekEndDate.length > 0,
  );
  TestValidator.predicate(
    "timesheet includes submittedAt field",
    () => timesheet.submittedAt !== undefined,
  );
  TestValidator.predicate("timesheet includes linked timelogs", () =>
    Array.isArray(timesheet.timesheetTimelogs),
  );
  if (timesheet.reviewedAt !== null) {
    TestValidator.predicate(
      "reviewedByMember exists when reviewedAt exists",
      () => timesheet.reviewedByMember !== null,
    );
  }
  if (timesheet.rejectionReason !== null) {
    TestValidator.predicate(
      "rejectionReason only appears for rejected timesheets",
      () => timesheet.status === "rejected",
    );
  }
  await TestValidator.error(
    "cannot access a timesheet from another organization",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.at(otherConnection, {
        timesheetId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
