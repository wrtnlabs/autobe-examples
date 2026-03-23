import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_status_no_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Login to get authentication token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(authenticatedConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(12),
      href: authenticatedConnection.host,
      referrer: authenticatedConnection.host,
    } satisfies IHrmTrackerMember.ILogin,
  });
  // 3. Check timer status - should return null with no active timer
  const status = await api.functional.hrmTracker.member.timers.status.at(
    authenticatedConnection,
  );
  typia.assert(status);
  // 4. Verify null response (no active timer)
  TestValidator.equals("no active timer", status, null);
}