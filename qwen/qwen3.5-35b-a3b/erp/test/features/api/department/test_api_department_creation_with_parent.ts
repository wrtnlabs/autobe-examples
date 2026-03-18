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

export async function test_api_department_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member and authorize
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Get organization ID from authorized response
  const organizationId =
    authorized.organization_memberships[0]?.organization.id;
  TestValidator.predicate(
    "member must have organization membership",
    !!organizationId,
  );
  // Step 2: Create NEW connection with token for subsequent API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authorized.token.access,
  };
  // Step 3: Create parent department (top-level, no parent)
  const parentDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      adminConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          description: "Engineering department",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  TestValidator.equals(
    "parent has no parent (top-level)",
    parentDepartment.parent,
    null,
  );
  // Step 4: Create child department referencing parent
  const childDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      adminConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          description: "Backend development team",
          parentDepartmentId: parentDepartment.id,
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // Step 5: Verify child department has parent populated with correct ID and name
  TestValidator.equals(
    "child has parent ID",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child has parent name",
    childDepartment.parent?.name,
    parentDepartment.name,
  );
  // Step 6: Verify one-level nesting constraint - cannot create grandchild
  // by referencing a department that already has a parent
  await TestValidator.error(
    "cannot create grandchild department (one-level nesting constraint)",
    async () => {
      await api.functional.hrms.member.organizations.departments.create(
        adminConnection,
        {
          organizationId,
          body: {
            name: RandomGenerator.name(),
            parentDepartmentId: childDepartment.id,
          } satisfies IHrmsDepartment.ICreate,
        },
      );
    },
  );
}
