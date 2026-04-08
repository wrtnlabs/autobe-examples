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

export async function test_api_timesheet_timelog_remove_from_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const scopedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const timesheetTimelogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "reject removal for non-existent timesheet timelog association",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        scopedConnection,
        {
          timesheetId,
          timesheetTimelogId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reject removal when the association belongs to a different timesheet",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        scopedConnection,
        {
          timesheetId: typia.random<string & tags.Format<"uuid">>(),
          timesheetTimelogId,
        },
      );
    },
  );
}
