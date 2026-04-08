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

export async function test_api_timesheet_timelog_delete_blocked_for_locked_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Aa1!${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const timesheetTimelogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a timelog association should fail when the timesheet is locked or missing",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId,
          timesheetTimelogId,
        },
      );
    },
  );
  await TestValidator.error(
    "repeating the same deletion should fail again",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId,
          timesheetTimelogId,
        },
      );
    },
  );
}
