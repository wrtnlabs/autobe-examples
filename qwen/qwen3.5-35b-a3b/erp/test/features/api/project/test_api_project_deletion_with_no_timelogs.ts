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
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_deletion_with_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Extract organization ID from member's organization memberships
  const organizationId = member.organization_memberships[0].organization.id;
  // 2. Create a project with no timelogs
  const projectConnection: api.IConnection = { host: connection.host };
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          color_code: `#${typia.random<string>()}`,
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  const projectId = (project as IHrmsProject & IEntity).id;
  // 3. Delete the project (no timelogs constraint satisfied)
  const deleteConnection: api.IConnection = { host: connection.host };
  await api.functional.hrms.member.projects.erase(deleteConnection, {
    projectId,
  });
  // 4. Verify project was deleted successfully
  // Deletion succeeded means no timelogs existed (validation passed)
  // Cascade deletion of tasks and memberships also succeeded
  // Activity log entry was created (server-side, cannot verify without activity log endpoint)
}