import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_update_parent_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    org_name: RandomGenerator.name(),
    org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    org_description: RandomGenerator.paragraph(),
    href: "https://app.test.example.com",
    referrer: "https://test.example.com",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: joinData,
  });
  typia.assert(member);
  // Create connection for member operations after login
  const memberOpConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(memberOpConnection, {
    body: {
      email: member.email,
      password: joinData.password,
    },
  });
  typia.assert(loginResponse);
  const organizationId: string =
    loginResponse.sessions?.[0]?.organization?.id ?? "";
  // 2. Create first parent department: 'Technology'
  const technologyDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberOpConnection,
      {
        organizationId,
        body: {
          name: "Technology",
        },
      },
    );
  typia.assert(technologyDepartment);
  typia.assert(technologyDepartment.parentDepartment === null);
  // 3. Create second parent department: 'Operations'
  const operationsDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberOpConnection,
      {
        organizationId,
        body: {
          name: "Operations",
        },
      },
    );
  typia.assert(operationsDepartment);
  typia.assert(operationsDepartment.parentDepartment === null);
  // 4. Create child department under 'Operations'
  const initialChildDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberOpConnection,
      {
        organizationId,
        body: {
          name: "Software Engineering",
          parent_department_id: operationsDepartment.id,
        },
      },
    );
  typia.assert(initialChildDepartment);
  // Verify initial parent is Operations
  TestValidator.equals(
    "initial parent is Operations",
    initialChildDepartment.parentDepartment?.id,
    operationsDepartment.id,
  );
  const initialUpdatedAt: string = initialChildDepartment.updated_at;
  // 5. Update the child department to have 'Technology' as new parent
  const updatedDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      memberOpConnection,
      {
        organizationId,
        departmentId: initialChildDepartment.id,
        body: {
          parent_department_id: technologyDepartment.id,
        },
      },
    );
  typia.assert(updatedDepartment);
  // 6. Verify the response shows updated parent_department_id
  TestValidator.equals(
    "parent updated to Technology",
    updatedDepartment.parentDepartment?.id,
    technologyDepartment.id,
  );
  // 7. Verify the department maintains all other properties
  TestValidator.equals(
    "name unchanged",
    updatedDepartment.name,
    initialChildDepartment.name,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedDepartment.organization.id,
    initialChildDepartment.organization.id,
  );
  TestValidator.equals(
    "id unchanged",
    updatedDepartment.id,
    initialChildDepartment.id,
  );
  // 8. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedDepartment.updated_at,
    initialUpdatedAt,
  );
  // 9. Verify department remains active (not soft-deleted)
  TestValidator.equals(
    "department not soft-deleted",
    updatedDepartment.deleted_at,
    null,
  );
  // 10. Verify parent hierarchy integrity - parentDepartment is correctly set
  TestValidator.equals(
    "parentDepartment set correctly",
    updatedDepartment.parentDepartment?.id,
    technologyDepartment.id,
  );
  TestValidator.equals(
    "parentDepartment name correct",
    updatedDepartment.parentDepartment?.name,
    technologyDepartment.name,
  );
  // Verify childDepartments relationship is maintained on Technology
  const technologyAfterUpdate =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      memberOpConnection,
      {
        organizationId,
        departmentId: technologyDepartment.id,
        body: {},
      },
    );
  typia.assert(technologyAfterUpdate);
  const hasSoftwareEngineeringChild =
    technologyAfterUpdate.childDepartments.some(
      (child: IHrmPlatformDepartment.ISummary) =>
        child.id === updatedDepartment.id,
    );
  TestValidator.predicate(
    "hierarchy integrity maintained - Technology has Software Engineering as child",
    hasSoftwareEngineeringChild,
  );
}
