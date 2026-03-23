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

export async function test_api_timer_status_retrieval_with_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member and verify email
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  TestValidator.predicate("email verified", member.email_verified);
  // 2. Get active timer status with authenticated connection
  const timer =
    await api.functional.hrmTracker.member.timers.status.at(memberConnection);
  typia.assert(timer);
  // 3. Validate returned timer structure
  TestValidator.equals(
    "employee_id matches member id",
    timer.employee_id,
    member.id,
  );
  TestValidator.predicate(
    "has valid start_timestamp",
    timer.start_timestamp !== undefined,
  );
  TestValidator.predicate(
    "has valid project_id",
    timer.project_id !== undefined,
  );
  TestValidator.predicate("has valid id", timer.id !== undefined);
}
