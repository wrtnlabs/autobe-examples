import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";

/**
 * Test successful department creation with minimal valid data.
 * Validates that a user with organization management permission can create a department
 * with just the required name field, and verify the complete response structure.
 */
export async function test_api_department_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration via authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Extract organization from member's organization_memberships
  TestValidator.predicate(
    "member has at least one organization membership",
    () => member.organization_memberships.length > 0,
  );
  const organizationMembership = member.organization_memberships[0];
  const organizationId: string & tags.Format<"uuid"> =
    organizationMembership.organization.id;
  // 3. Create department with minimal valid data (name only)
  const departmentName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 6,
  });
  const department: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: departmentName,
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Verify response structure - complete department object
  TestValidator.equals(
    "organization_id matches",
    department.organization.id,
    organizationId,
  );
  TestValidator.equals("parent is null", department.parent, null);
  TestValidator.equals("children array is empty", department.children, []);
  TestValidator.predicate(
    "has created_at timestamp",
    department.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    department.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", department.deleted_at, null);
  TestValidator.equals("name matches input", department.name, departmentName);
}
