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

export async function test_api_department_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization (join creates org automatically)
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
  // Get organization ID from member's organization memberships
  const organizationId = member.organization_memberships[0]?.organization.id;
  TestValidator.predicate("organization exists", organizationId !== undefined);
  // 2. Create parent department
  const parentDept: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organizationId!,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentDept);
  TestValidator.predicate(
    "parent department has id",
    parentDept.id !== undefined,
  );
  // 3. Create child department with parent reference (one-level hierarchy)
  const childDept: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organizationId!,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentDepartmentId: parentDept.id,
        },
      },
    );
  typia.assert(childDept);
  TestValidator.predicate(
    "child department has id",
    childDept.id !== undefined,
  );
  // 4. Retrieve the child department to verify parent relationship is resolved
  const retrievedDept: IHrmsDepartment =
    await api.functional.hrms.member.departments.at(memberConnection, {
      departmentId: childDept.id,
    });
  typia.assert(retrievedDept);
  // 5. Validate department details
  TestValidator.equals("retrieved id matches", retrievedDept.id, childDept.id);
  TestValidator.equals("name matches", retrievedDept.name, childDept.name);
  TestValidator.equals(
    "description matches",
    retrievedDept.description,
    childDept.description,
  );
  // 6. Validate parent relationship (critical: one-level nesting)
  TestValidator.predicate(
    "has parent reference",
    retrievedDept.parent !== null,
  );
  if (retrievedDept.parent) {
    TestValidator.equals(
      "parent id matches",
      retrievedDept.parent.id,
      parentDept.id,
    );
    TestValidator.equals(
      "parent name matches",
      retrievedDept.parent.name,
      parentDept.name,
    );
  }
  // 7. Validate organization reference
  TestValidator.equals(
    "organization id matches",
    retrievedDept.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedDept.organization.name,
    member.organization_memberships[0]?.organization.name,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "has created_at",
    retrievedDept.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    retrievedDept.updated_at !== undefined,
  );
  // 9. Validate soft delete status (null means active)
  TestValidator.equals(
    "deleted_at is null (active)",
    retrievedDept.deleted_at,
    null,
  );
  // 10. Validate children array (should exist, may be empty if no children)
  TestValidator.predicate(
    "has children array",
    retrievedDept.children !== undefined,
  );
}
