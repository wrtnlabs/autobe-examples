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

/**
 * Test project creation with minimal required data (name and color_code only).
 *
 * 1. Register a new member account
 * 2. Extract organization from member's organization memberships
 * 3. Create project with only mandatory fields (name, color_code)
 * 4. Verify project is created with correct defaults for optional fields
 * 5. Verify all required system fields are populated
 */
export async function test_api_project_creation_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authorized connection
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
  // 2. Verify member has at least one organization membership
  TestValidator.predicate(
    "member has at least one organization",
    member.organization_memberships.length > 0,
  );
  // 3. Get organization from first membership
  const firstMembership = member.organization_memberships[0];
  typia.assert(firstMembership);
  const organization = firstMembership.organization;
  typia.assert(organization);
  // 4. Generate minimal project data with only required fields
  const projectName = RandomGenerator.name(3);
  const projectColorCode = typia.random<
    string & tags.Pattern<"^#[0-9a-fA-F]{6}$">
  >();
  // 5. Create project with minimal data (only name and color_code)
  const project: IHrmsProject =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: projectName,
          color_code: projectColorCode,
        },
      },
    );
  typia.assert(project);
  // 6. Validate project creation - test dashboard type fields
  TestValidator.equals(
    "has valid dashboard_type",
    project.dashboard_type,
    "personal",
  );
  TestValidator.predicate(
    "has valid generation_timestamp",
    project.generation_timestamp !== undefined,
  );
}
