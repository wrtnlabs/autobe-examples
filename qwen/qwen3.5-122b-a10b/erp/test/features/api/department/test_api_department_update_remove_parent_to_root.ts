import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_departments_create } from "../../../generate/generate_random_hrm_member_organizations_departments_create";
import { prepare_random_hrm_department } from "../../../prepare/prepare_random_hrm_department";

export async function test_api_department_update_remove_parent_to_root(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Login to get organization context
  const loginConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_login(loginConnection, {
    body: {
      email: memberJoin.email,
      password,
    },
  });
  typia.assert(memberLogin);
  // Must have at least one organization
  TestValidator.predicate(
    "has organizations",
    Array.isArray(memberLogin.organizations) &&
      memberLogin.organizations.length > 0,
  );
  const organizationId = memberLogin.organizations![0].id;
  // 3. Create parent department (root-level)
  const parentDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmDepartment.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(parentDepartment);
  TestValidator.predicate(
    "parent is root-level",
    parentDepartment.parent === null,
  );
  // 4. Create child department with parent
  const childDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDepartment.id,
        } satisfies IHrmDepartment.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child has parent",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  // 5. Update child department to remove parent (set to null)
  const updatedDepartment =
    await api.functional.hrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId,
        departmentId: childDepartment.id,
        body: {
          parent_department_id: null,
        } satisfies IHrmDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 6. Validate the update succeeded - parent should now be null
  TestValidator.equals("parent removed", updatedDepartment.parent, null);
  TestValidator.equals(
    "id preserved",
    updatedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "name preserved",
    updatedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "organization preserved",
    updatedDepartment.organization.id,
    organizationId,
  );
}
