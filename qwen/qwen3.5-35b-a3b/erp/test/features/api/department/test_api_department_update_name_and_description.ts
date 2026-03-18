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

export async function test_api_department_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (member will be org owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 2. Get organization from member's organization memberships
  TestValidator.equals(
    "member has organization",
    member.organization_memberships.length,
    1,
  );
  const organization = member.organization_memberships[0].organization;
  const organizationId: string = organization.id;
  // 3. Create initial department
  const originalDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Sales Department",
          description: "Sales team",
          parentDepartmentId: null,
        },
      },
    );
  typia.assert(originalDepartment);
  const createdAt: string = originalDepartment.created_at;
  const originalName: string = originalDepartment.name;
  const originalDescription: string | null = originalDepartment.description ?? null;
  const originalParent: IHrmsDepartment.ISummary | null =
    originalDepartment.parent ?? null;
  const originalOrganizationId: string = originalDepartment.organization.id;
  // Wait a moment to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Update department name and description
  const updatedDepartment = await api.functional.hrms.member.departments.update(
    memberConnection,
    {
      departmentId: originalDepartment.id,
      body: {
        name: "Sales and Marketing Department",
        description: "Sales and marketing teams",
        parent_id: null,
      },
    },
  );
  typia.assert(updatedDepartment);
  // 5. Verify updated_at is refreshed (after original creation time)
  TestValidator.equals(
    "updated_at refreshed",
    updatedDepartment.updated_at > createdAt,
    true,
  );
  // 6. Verify name changed
  TestValidator.equals(
    "name updated",
    updatedDepartment.name,
    "Sales and Marketing Department",
  );
  // 7. Verify description changed
  TestValidator.equals(
    "description updated",
    updatedDepartment.description,
    "Sales and marketing teams",
  );
  // 8. Verify unchanged properties
  TestValidator.equals(
    "id unchanged",
    updatedDepartment.id,
    originalDepartment.id,
  );
  TestValidator.equals(
    "organization_id unchanged",
    updatedDepartment.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedDepartment.created_at,
    originalDepartment.created_at,
  );
  TestValidator.equals(
    "parent unchanged",
    updatedDepartment.parent,
    originalParent,
  );
  TestValidator.equals(
    "children unchanged",
    updatedDepartment.children,
    originalDepartment.children,
  );
}