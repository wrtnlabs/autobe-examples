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

export async function test_api_department_update_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Extract organization ID from authenticated member
  TestValidator.predicate(
    "member has at least one organization membership",
    () => authResponse.organization_memberships.length > 0,
  );
  const organization = authResponse.organization_memberships[0].organization;
  typia.assert(organization.id);
  // Step 3: Create parent department (Engineering Department) - top-level
  const parentDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Engineering Department",
          description: "Parent engineering department",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  typia.assert(parentDepartment.id);
  // Step 4: Create child department (Backend Team) - initially top-level (no parent)
  const childDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Backend Team",
          description: "Backend development team - initially top-level",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  typia.assert(childDepartment.id);
  // Step 5: Verify child department is initially top-level (parent is null)
  TestValidator.equals(
    "child department starts without parent",
    childDepartment.parent,
    null,
  );
  // Step 6: Update child department to assign parent department
  const beforeUpdate = childDepartment.updated_at;
  const updatedDepartment = await api.functional.hrms.member.departments.update(
    memberConnection,
    {
      departmentId: childDepartment.id,
      body: {
        parent_id: parentDepartment.id,
      } satisfies IHrmsDepartment.IUpdate,
    },
  );
  typia.assert(updatedDepartment);
  // Step 7: Verify parent_id is set to parent department's ID
  TestValidator.equals(
    "parent_id set to engineering department",
    updatedDepartment.parent?.id,
    parentDepartment.id,
  );
  // Step 8: Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    beforeUpdate,
    updatedDepartment.updated_at,
  );
  // Step 9: Verify parent reference is properly resolved
  const parent = typia.assert(updatedDepartment.parent!);
  TestValidator.equals(
    "parent reference resolved correctly",
    parent.name,
    parentDepartment.name,
  );
}
