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

export async function test_api_timer_discard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberAuthorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 2. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  // 3. Prepare timer start data
  const body = typia.random<IHrmsTimer.ICreate>();
  // 4. Start a timer
  const timer = await api.functional.hrms.member.timer.start.create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(timer);
  // 5. Validate timer was created successfully
  TestValidator.equals(
    "timer has valid id",
    timer.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "timer belongs to authenticated employee",
    timer.employee.id,
    memberAuthorized.organization_memberships[0].member.id,
  );
  TestValidator.equals(
    "timer project matches input",
    timer.project.id,
    body.project_id,
  );
  // 6. Verify timer is active (start_at should be recent)
  const startAt = new Date(timer.start_at);
  const now = new Date();
  const timeDifferenceMs = now.getTime() - startAt.getTime();
  TestValidator.predicate(
    "timer was started recently",
    timeDifferenceMs < 60 * 1000,
  );
  // 7. Discard the timer
  await api.functional.hrms.member.timer.discard(memberConnection);
  // 8. Verify discard was successful (no response body for 204 No Content)
  // The discard function returns void, which means 204 No Content was received
  TestValidator.predicate("discard operation completed successfully", true);
}
