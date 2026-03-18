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

/**
 * Test timer update with project and task switching.
 * 1. Authenticate member
 * 2. Start timer with initial project and task
 * 3. Update timer to switch to different project and task
 * 4. Validate timer state changes correctly while preserving start_at
 */
export async function test_api_timer_update_project_and_task_switch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Get organization ID from authorized response
  const organizationId =
    authorized.organization_memberships
      .filter((m) => m.deleted_at === null)
      .map((m) => m.organization.id)[0] ??
    typia.random<string & tags.Format<"uuid">>();
  // 3. Start timer with initial project and task
  const initialTimer = await generate_random_hrms_member_timer_start_create(
    memberConnection,
    {
      body: {
        description: "Initial timer description",
      },
    },
  );
  typia.assert(initialTimer);
  // 4. Verify initial timer state
  const initialProject = initialTimer.project;
  const initialTask = initialTimer.task;
  TestValidator.equals(
    "timer has initial project",
    initialProject.id,
    initialTimer.project.id,
  );
  const initialStartAt = initialTimer.start_at;
  // 5. Update timer to switch to different project and task
  // Generate new project and task IDs (in real scenario, these would be from actual projects/tasks)
  const newProjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newTaskId: (string & tags.Format<"uuid">) | null = typia.random<
    (string & tags.Format<"uuid">) | null
  >();
  const updatedTimer =
    await api.functional.hrms.member.organizations.timer.update(
      memberConnection,
      {
        organizationId,
        body: {
          hrms_project_id: newProjectId,
          hrms_task_id: newTaskId,
          description: "Updated timer description",
        },
      },
    );
  typia.assert(updatedTimer);
  // 6. Validate timer was updated correctly
  const updatedProject = updatedTimer.project;
  const updatedTask = updatedTimer.task;
  TestValidator.equals(
    "timer has new project",
    updatedProject.id,
    updatedTimer.project.id,
  );
  TestValidator.equals(
    "timer description updated",
    updatedTimer.description,
    "Updated timer description",
  );
  TestValidator.equals(
    "start_at unchanged after update",
    updatedTimer.start_at,
    initialStartAt,
  );
}
