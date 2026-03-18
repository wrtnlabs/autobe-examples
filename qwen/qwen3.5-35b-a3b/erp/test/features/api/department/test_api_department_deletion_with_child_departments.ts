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

export async function test_api_department_deletion_with_child_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth: Create member with org:manage permission
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  memberConnection.headers!.Authorization = authorized.token.access;
  // 3. Get organization from memberships
  const memberOrg = authorized.organization_memberships[0];
  typia.assert(memberOrg);
  // 4. Create parent department
  const parentDepartment =
    await generate_random_hrms_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          organizationId: memberOrg.organization.id,
        },
      },
    );
  typia.assert(parentDepartment);
  typia.assert(parentDepartment.id);
  // 5. Create child department referencing parent
  const childDepartment =
    await generate_random_hrms_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentDepartmentId: parentDepartment.id,
        },
        params: {
          organizationId: memberOrg.organization.id,
        },
      },
    );
  typia.assert(childDepartment);
  typia.assert(childDepartment.id);
  // 6. Validate child has correct parent reference
  const childParent = typia.assert<IHrmsDepartment>(childDepartment.parent!);
  TestValidator.equals(
    "child parent reference correct",
    childParent.id,
    parentDepartment.id,
  );
  // 7. Attempt to delete parent department - should fail with 409
  await TestValidator.httpError(
    "parent deletion blocked by child departments",
    409,
    async () => {
      await api.functional.hrms.member.departments.erase(memberConnection, {
        departmentId: parentDepartment.id,
      });
    },
  );
}
