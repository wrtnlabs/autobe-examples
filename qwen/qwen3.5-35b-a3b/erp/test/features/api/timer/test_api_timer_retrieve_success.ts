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

export async function test_api_timer_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Start timer for the authenticated member
  const timer: IHrmsTimer =
    await generate_random_hrms_member_timer_start_create(memberConnection, {
      body: {},
    });
  typia.assert(timer);
  // 3. Retrieve the timer by ID
  const retrievedTimer: IHrmsTimer = await api.functional.hrms.member.timers.at(
    memberConnection,
    { timerId: timer.id },
  );
  typia.assert(retrievedTimer);
  // 4. Validate response structure
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  // 5. Validate employee information
  TestValidator.equals(
    "employee ID matches timer owner",
    retrievedTimer.employee.id,
    timer.employee.id,
  );
  // 6. Validate project information
  TestValidator.equals(
    "project ID matches",
    retrievedTimer.project.id,
    timer.project.id,
  );
  // 7. Validate task information (can be null)
  if (timer.task) {
    typia.assert<IHrmsTask.ISummary>(timer.task);
    typia.assert<IHrmsTask.ISummary>(retrievedTimer.task!);
  } else {
    TestValidator.equals(
      "task is null when not assigned",
      retrievedTimer.task,
      null,
    );
  }
  // 8. Validate start timestamp is valid date-time
  typia.assert(retrievedTimer.start_at);
  // 9. Validate lifecycle timestamps
  typia.assert(retrievedTimer.created_at);
  typia.assert(retrievedTimer.updated_at);
  // 10. Validate description
  TestValidator.equals(
    "description matches",
    retrievedTimer.description,
    timer.description,
  );
}
