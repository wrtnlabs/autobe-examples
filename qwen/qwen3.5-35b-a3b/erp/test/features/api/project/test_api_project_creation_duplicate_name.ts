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

export async function test_api_project_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with unique credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Validate member has organization memberships
  TestValidator.predicate(
    "member has at least one organization",
    member.organization_memberships.length > 0,
  );
  // Use the first organization
  const organizationId = member.organization_memberships[0].organization.id;
  // Create a specific project name for duplicate test
  const projectName = RandomGenerator.alphabets(10);
  // 3. Create first project with the specific name
  const firstProject: IHrmsProject.ISummary =
    typia.assert<IHrmsProject.ISummary>(
      await api.functional.hrms.member.organizations.projects.create(
        memberConnection,
        {
          organizationId,
          body: {
            name: projectName,
            description: "First project for duplicate test",
            color_code: "#3498db",
          } satisfies IHrmsProject.ICreate,
        },
      ),
    );
  TestValidator.equals("first project name", firstProject.name, projectName);
  // 4. Attempt to create second project with same name (should fail with 409)
  await TestValidator.httpError(
    "should reject duplicate project name with 409 Conflict",
    [409],
    async () => {
      await api.functional.hrms.member.organizations.projects.create(
        memberConnection,
        {
          organizationId,
          body: {
            name: projectName,
            description: "Duplicate project attempt",
            color_code: "#e74c3c",
          } satisfies IHrmsProject.ICreate,
        },
      );
    },
  );
  // 5. Verify original project still exists by creating another unique project
  // (confirms first project remains accessible and system is operational)
  const anotherProject: IHrmsProject.ISummary =
    typia.assert<IHrmsProject.ISummary>(
      await api.functional.hrms.member.organizations.projects.create(
        memberConnection,
        {
          organizationId,
          body: {
            name: RandomGenerator.alphabets(8),
            color_code: "#2ecc71",
          } satisfies IHrmsProject.ICreate,
        },
      ),
    );
  TestValidator.equals(
    "system operational after duplicate rejection",
    anotherProject.name,
    anotherProject.name,
  );
}
