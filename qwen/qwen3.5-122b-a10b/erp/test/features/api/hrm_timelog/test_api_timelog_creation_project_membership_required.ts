import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

export async function test_api_timelog_creation_project_membership_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get organization from member's organizations array
  // The member should have at least one organization after joining
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must have at least one organization after joining");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 3. Create a project in the organization (employee NOT assigned to it)
  const project = await api.functional.hrm.member.organizations.projects.create(
    memberConnection,
    {
      organizationId,
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
      } satisfies IHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Attempt to create a timelog for the project (should fail - no project membership)
  // The employee exists in the organization but is not assigned to this specific project
  await TestValidator.httpError(
    "timelog creation should fail without project membership",
    403,
    async () => {
      await api.functional.hrm.member.organizations.timelogs.create(
        memberConnection,
        {
          organizationId,
          body: {
            hrm_project_id: project.id,
            date: new Date().toISOString(),
            duration_minutes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
            >(),
            billable: true,
          } satisfies IHrmTimelog.ICreate,
        },
      );
    },
  );
}
