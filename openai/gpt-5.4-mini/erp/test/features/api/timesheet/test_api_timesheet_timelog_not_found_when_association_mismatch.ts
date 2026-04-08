import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_timelog_not_found_when_association_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const timelogId = typia.random<string & tags.Format<"uuid">>();
  const otherTimesheetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched association should be not found",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId,
          timesheetTimelogId: timelogId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "absent association should be not found",
    [404],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId: otherTimesheetId,
          timesheetTimelogId: timelogId,
        },
      );
    },
  );
}
