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

export async function test_api_department_create_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Note: In a real test environment, an organization would be created and the
  // member would be associated with it. For this test, we use a generated UUID
  // to represent an existing organization.
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create a parent department (root-level, no parent)
  const parentDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(parentDepartment);
  // Validate parent department is root-level (no parent)
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parent,
    null,
  );
  // 3. Create a child department with parent_department_id
  const childDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDepartment.id,
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(childDepartment);
  // 4. Validate child department has parent reference in response
  // The create endpoint returns IHrmDepartment which includes the parent field
  TestValidator.notEquals(
    "child department has parent reference",
    childDepartment.parent,
    null,
  );
  // 5. Validate parent reference contains correct data
  if (childDepartment.parent !== null && childDepartment.parent !== undefined) {
    TestValidator.equals(
      "parent id matches",
      childDepartment.parent.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      childDepartment.parent.name,
      parentDepartment.name,
    );
  }
  // 6. Validate child department structure
  TestValidator.predicate(
    "child department has valid id",
    childDepartment.id.length > 0,
  );
  TestValidator.predicate(
    "child department has valid name",
    childDepartment.name.length > 0,
  );
  TestValidator.predicate(
    "child department has valid created_at",
    childDepartment.created_at.length > 0,
  );
}
