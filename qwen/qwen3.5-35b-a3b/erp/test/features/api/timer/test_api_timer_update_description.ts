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

export async function test_api_timer_update_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>() satisfies string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string & tags.Format<"uri">,
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Start a timer with project assignment
  const timerConnection: api.IConnection = { host: connection.host };
  const timer = await api.functional.hrms.member.timers.create(
    timerConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 3. Update timer description
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedTimer = await api.functional.hrms.member.timers.update(
    timerConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IHrmsTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 4. Validate response
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    newDescription,
  );
  TestValidator.equals(
    "start_at unchanged",
    updatedTimer.start_at,
    timer.start_at,
  );
  TestValidator.equals(
    "project unchanged",
    updatedTimer.project.id,
    timer.project.id,
  );
  TestValidator.notEquals(
    "updated_at changed",
    timer.updated_at,
    updatedTimer.updated_at,
  );
  TestValidator.predicate(
    "has valid description length",
    (updatedTimer.description?.length ?? 0) <= 500,
  );
}