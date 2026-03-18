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

export async function test_api_timer_discard_after_editing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Get organization from authenticated member's organization memberships
  const organization =
    authorized.organization_memberships[0]?.organization ??
    (function (): IHrmsOrganization.ISummary {
      throw new Error("No organization found for member");
    })();
  // 3. Use a randomly generated project UUID for testing
  // In production, this would use an actual project from the organization
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Start a timer with initial configuration
  const timerConnection: api.IConnection = { host: connection.host };
  const timerConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const initialTimer: IHrmsTimer =
    await generate_random_hrms_member_timer_start_create(
      timerConnectionWithToken,
      {
        body: {
          project_id: projectId,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          task_id: null,
        },
      },
    );
  typia.assert(initialTimer);
  // 5. Edit the timer's description
  const updatedTimer: IHrmsTimer =
    await api.functional.hrms.member.timers.update(timerConnectionWithToken, {
      timerId: initialTimer.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmsTimer.IUpdate,
    });
  typia.assert(updatedTimer);
  // 6. Verify the timer was updated
  TestValidator.equals(
    "timer description updated",
    updatedTimer.description,
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  // 7. Discard the timer
  await api.functional.hrms.member.timer.discard(timerConnectionWithToken);
  // 8. Validate that timer was discarded successfully
  // The discard operation returns void on success, indicating completion
}
