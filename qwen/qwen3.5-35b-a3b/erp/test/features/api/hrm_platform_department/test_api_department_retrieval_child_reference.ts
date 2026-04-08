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

export async function test_api_department_retrieval_child_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member (creates member + organization)
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // Create connections for subsequent API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: authResult.token.access };
  // 2. Create parent department
  const parentConnection: api.IConnection = { host: connection.host };
  parentConnection.headers = { Authorization: authResult.token.access };
  const parentDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      parentConnection,
      {
        organizationId: authResult.member.id,
        body: {
          name: "Engineering",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  const organizationId = parentDepartment.organization.id;
  // 3. Create child department with parent reference
  const childConnection: api.IConnection = { host: connection.host };
  childConnection.headers = { Authorization: authResult.token.access };
  const childDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      childConnection,
      {
        organizationId,
        body: {
          name: "Frontend Development",
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Retrieve child department
  const retrieveConnection: api.IConnection = { host: connection.host };
  retrieveConnection.headers = { Authorization: authResult.token.access };
  const retrievedChild =
    await api.functional.hrmPlatform.member.organizations.departments.at(
      retrieveConnection,
      {
        organizationId,
        departmentId: childDepartment.id,
      },
    );
  typia.assert(retrievedChild);
  // 5. Validate child department entity
  TestValidator.equals(
    "child department id matches",
    retrievedChild.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name matches",
    retrievedChild.name,
    "Frontend Development",
  );
  TestValidator.equals(
    "organization matches parent's organization",
    retrievedChild.organization.id,
    organizationId,
  );
  // 6. Validate parent department reference
  TestValidator.notEquals(
    "parent department is not null",
    retrievedChild.parentDepartment,
    null,
  );
  TestValidator.equals(
    "parent department id matches",
    retrievedChild.parentDepartment!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent department name matches",
    retrievedChild.parentDepartment!.name,
    "Engineering",
  );
  TestValidator.equals(
    "parent department organization matches",
    retrievedChild.parentDepartment!.organization.id,
    organizationId,
  );
  // 7. Validate child departments array is empty (leaf node)
  TestValidator.equals(
    "child departments is empty array",
    retrievedChild.childDepartments.length,
    0,
  );
}
