import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_update_description_while_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member employee
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a project for the employee to track time against
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Start a running timer with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 1 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: initialDescription,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Verify timer is running (stopped_at is null)
  TestValidator.predicate("timer is running", timer.stopped_at === null);
  TestValidator.equals(
    "initial description matches",
    timer.description,
    initialDescription,
  );
  // 4. Update the timer with a new description while it's still running
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 5. Verify the response contains the updated description
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    newDescription,
  );
  // 6. Verify the started_at timestamp remains unchanged
  TestValidator.equals(
    "started_at unchanged",
    updatedTimer.started_at,
    timer.started_at,
  );
  // 7. Verify the timer remains in running state (stopped_at is still null)
  TestValidator.predicate(
    "timer still running",
    updatedTimer.stopped_at === null,
  );
  // 8. Verify the updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedTimer.updated_at,
    timer.updated_at,
  );
}
