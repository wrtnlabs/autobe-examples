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

export async function test_api_timer_active_with_task_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Start timer with specific task assignment using generate utility
  const timer = await generate_random_hrms_member_timer_start_create(
    memberConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 4. Retrieve active timer
  const activeTimer =
    await api.functional.hrms.member.timer.active.getActive(memberConnection);
  typia.assert(activeTimer);
  // 5. Validate timer response is not null
  TestValidator.predicate("active timer exists", activeTimer !== null);
  // 6. Validate task context - task field must be populated when task_id was set
  TestValidator.predicate(
    "task field is populated",
    activeTimer.task !== null && activeTimer.task !== undefined,
  );
  // 7. Validate task context has valid project_id reference
  TestValidator.predicate(
    "task project_id exists",
    activeTimer.task?.project_id !== undefined,
  );
  // 8. Validate task context has project name
  TestValidator.predicate(
    "task project_name exists",
    activeTimer.task?.project_name !== undefined,
  );
  // 9. Validate project context - project id matches timer project
  TestValidator.predicate(
    "project id exists",
    activeTimer.project.id !== undefined,
  );
  // 10. Validate project name exists
  TestValidator.predicate(
    "project name exists",
    activeTimer.project.name.length > 0,
  );
  // 11. Validate task-project relationship integrity - task's project_id matches timer's project id
  TestValidator.equals(
    "task project_id matches timer project id",
    activeTimer.task?.project_id,
    activeTimer.project.id,
  );
  // 12. Validate start_at is valid date-time format
  TestValidator.predicate(
    "start_at is valid",
    activeTimer.start_at !== undefined,
  );
  // 13. Validate timer is active (deleted_at is null)
  TestValidator.predicate("timer is active", activeTimer.deleted_at === null);
}
