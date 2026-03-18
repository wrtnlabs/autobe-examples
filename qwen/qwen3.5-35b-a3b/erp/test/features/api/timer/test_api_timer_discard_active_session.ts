import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_timer_start_create } from "../../../generate/generate_random_hrms_member_timer_start_create";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";

export async function test_api_timer_discard_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member for timer operations
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(authorized);
  // 2. Start a timer for the authenticated employee
  const timer = await generate_random_hrms_member_timer_start_create(
    memberConnection,
    {
      body: {
        description: "Test timer to be discarded",
      },
    },
  );
  typia.assert(timer);
  // Verify timer is active (not deleted)
  TestValidator.equals("timer should be active", timer.deleted_at, null);
  // 3. Discard the active timer by calling DELETE /hrms/member/timer
  await api.functional.hrms.member.timer.erase(memberConnection);
  // 4. Verify employee can immediately start a new timer after discarding
  // This confirms the unique constraint on hrms_employee_id allows reusing the employee
  const newTimer = await generate_random_hrms_member_timer_start_create(
    memberConnection,
    {
      body: {
        description: "New timer after discard",
      },
    },
  );
  typia.assert(newTimer);
  // 5. Verify new timer is different from the discarded one
  TestValidator.notEquals(
    "new timer should be different from discarded",
    timer.id,
    newTimer.id,
  );
  // 6. Verify timers have different start times
  TestValidator.notEquals(
    "timers should have different start times",
    timer.start_at,
    newTimer.start_at,
  );
}
