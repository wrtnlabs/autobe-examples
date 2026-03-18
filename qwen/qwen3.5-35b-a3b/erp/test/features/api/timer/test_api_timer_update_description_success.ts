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

export async function test_api_timer_update_description_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Get organization from membership
  const organizationId: string & tags.Format<"uuid"> =
    member.organization_memberships[0].organization.id;
  // 3. Start timer with initial description
  const timerConnection: api.IConnection = { host: connection.host };
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  const project_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const timer: IHrmsTimer =
    await generate_random_hrms_member_timer_start_create(timerConnection, {
      body: {
        project_id,
        description: initialDescription,
      },
    });
  typia.assert(timer);
  // 4. Update timer description
  const updatedTimer: IHrmsTimer =
    await api.functional.hrms.member.organizations.timer.update(
      timerConnection,
      {
        organizationId,
        body: {
          description: updatedDescription,
        },
      },
    );
  typia.assert(updatedTimer);
  // 5. Validate the update
  TestValidator.equals(
    "description updated successfully",
    updatedTimer.description,
    updatedDescription,
  );
  TestValidator.equals("timer ID unchanged", updatedTimer.id, timer.id);
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
    "updated_at changed after modification",
    updatedTimer.updated_at,
    timer.updated_at,
  );
}
