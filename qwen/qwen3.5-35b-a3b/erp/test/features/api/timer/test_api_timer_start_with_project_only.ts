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
import { generate_random_hrms_member_timers_create } from "../../../generate/generate_random_hrms_member_timers_create";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";

export async function test_api_timer_start_with_project_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create timer with project only (no task)
  // The generation function handles project assignment internally for testing
  const timer = await api.functional.hrms.member.timers.create(
    memberConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: null,
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 3. Validate timer creation for project-level tracking
  TestValidator.equals(
    "task_id is NULL for project-level tracking",
    timer.task,
    null,
  );
  TestValidator.predicate(
    "project_id is recorded",
    timer.project.id !== undefined,
  );
  TestValidator.predicate("start_at is recorded", timer.start_at !== undefined);
  TestValidator.equals(
    "deleted_at is NULL for active timer",
    timer.deleted_at,
    null,
  );
  TestValidator.predicate(
    "start_at is valid date-time",
    () => !isNaN(Date.parse(timer.start_at)),
  );
  TestValidator.predicate(
    "timer is owned by authenticated member",
    () => timer.employee.id === authorized.id,
  );
}