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

export async function test_api_timer_discard_no_timer_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup - register and start timer
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberA);
  // Create a project UUID for timer
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // Start timer for member A
  const memberATimer = await api.functional.hrms.member.timer.start.create(
    memberAConnection,
    {
      body: {
        project_id: projectId,
        task_id: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(memberATimer);
  const memberATimerId = memberATimer.id;
  TestValidator.predicate(
    "member A timer is active (deleted_at is null)",
    memberATimer.deleted_at === null,
  );
  // 2. Member B setup - fresh registration, no timer
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member B attempts to discard timer (should fail with 404)
  await TestValidator.error(
    "member B should not be able to discard non-existent timer",
    async () => {
      await api.functional.hrms.member.timer.erase(memberBConnection);
    },
  );
  // 4. Verify member A's timer remains active
  TestValidator.equals(
    "member A timer ID unchanged after member B operation",
    memberATimerId,
    memberATimer.id,
  );
  TestValidator.predicate(
    "member A timer still active after member B failed discard",
    memberATimer.deleted_at === null,
  );
}
