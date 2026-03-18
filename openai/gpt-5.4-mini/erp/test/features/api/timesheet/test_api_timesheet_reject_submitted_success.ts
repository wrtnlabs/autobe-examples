import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_reject_submitted_success(
  connection: api.IConnection,
): Promise<void> {
  const approverConnection: api.IConnection = { host: connection.host };
  const approverEmail = typia.random<string & tags.Format<"email">>();
  const approverPassword = RandomGenerator.alphaNumeric(16);
  const approver = await authorize_member_join(approverConnection, {
    body: {
      email: approverEmail,
      password: approverPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(approver);
  const rejected =
    await api.functional.hrmTimeTracking.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rejectionReason: true,
        } satisfies IHrmTimeTrackingTimesheet.IReject,
      },
    );
  typia.assert(rejected);
  TestValidator.equals("status rejected", rejected.status, "rejected");
  TestValidator.predicate(
    "reviewedAt set",
    rejected.reviewedAt !== null && rejected.reviewedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewedByEmployee set",
    rejected.reviewedByEmployee !== null &&
      rejected.reviewedByEmployee !== undefined,
  );
  TestValidator.equals(
    "rejection reason stored",
    rejected.rejectionReason,
    true,
  );
}
