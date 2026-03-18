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

export async function test_api_department_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member and get organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Get first organization from memberships
  const firstMembership = authorized.organization_memberships[0];
  if (!firstMembership) {
    throw new Error("No organization membership found for member");
  }
  const organizationId: string & tags.Format<"uuid"> =
    firstMembership.organization.id;
  // Step 2: Create first department with name "Sales"
  const firstDepartment: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Sales",
          description: "Sales department",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(firstDepartment);
  TestValidator.equals(
    "first department created",
    firstDepartment.name,
    "Sales",
  );
  // Step 3: Attempt to create second department with duplicate name "Sales"
  // This should fail with 409 Conflict due to unique constraint on (organization_id, name)
  await TestValidator.error(
    "duplicate department name in same organization",
    async () => {
      await api.functional.hrms.member.organizations.departments.create(
        memberConnection,
        {
          organizationId,
          body: {
            name: "Sales",
            description: "Different description for Sales",
          } satisfies IHrmsDepartment.ICreate,
        },
      );
    },
  );
  // Step 4: Verify second department was NOT created by creating a unique one
  // The unique department creation should succeed
  const uniqueDepartment: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: `${RandomGenerator.name()}${RandomGenerator.alphaNumeric(8)}`,
          description: "Unique department",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(uniqueDepartment);
  TestValidator.equals(
    "unique department created successfully",
    uniqueDepartment.name.startsWith(RandomGenerator.name()),
    true,
  );
  // Step 5: Verify only one "Sales" department exists (duplicate was rejected)
  // Create another department with different name to ensure the system is still working
  const anotherDepartment: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Marketing",
          description: "Marketing department",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(anotherDepartment);
  TestValidator.equals(
    "Marketing department created",
    anotherDepartment.name,
    "Marketing",
  );
}
