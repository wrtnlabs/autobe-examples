import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_creation_by_member_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create organization membership (admin creates first)
  const adminConnection: api.IConnection = { host: connection.host };
  const orgMembership =
    await generate_random_hrms_member_organization_members_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(orgMembership);
  // 2. Authenticate member user (regular employee, not project lead)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create member user connection with authorization token (fix: include headers directly)
  const memberUserConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 4. Test task creation should fail for unauthorized member (no project:manage permission)
  await TestValidator.error(
    "task creation should fail for member without project:manage permission",
    async () => {
      await api.functional.hrms.member.projects.tasks.create(
        memberUserConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IHrmsTask.ICreate,
        },
      );
    },
  );
}
