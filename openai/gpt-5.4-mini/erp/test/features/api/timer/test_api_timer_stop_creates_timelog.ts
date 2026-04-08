import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_stop_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd1234!",
        displayName: RandomGenerator.name(),
        avatarImageUrl: null,
        phoneNumber: RandomGenerator.mobile(),
        href: `http://localhost/${RandomGenerator.alphabets(8)}`,
        referrer: `http://localhost/${RandomGenerator.alphabets(8)}`,
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const timelog =
    await api.functional.erpHrmTime.member.timers.stop.stopTimer(
      memberConnection,
    );
  typia.assert(timelog);
  TestValidator.predicate(
    "timelog duration is positive",
    timelog.durationMinutes > 0,
  );
  TestValidator.predicate(
    "timelog billable is boolean",
    typeof timelog.billable === "boolean",
  );
  TestValidator.predicate(
    "timelog work date is populated",
    timelog.workDate.length > 0,
  );
  TestValidator.predicate("timelog id is populated", timelog.id.length > 0);
}
