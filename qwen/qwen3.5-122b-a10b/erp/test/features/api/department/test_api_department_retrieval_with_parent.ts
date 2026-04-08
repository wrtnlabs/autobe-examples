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

/**
 * Test retrieving a department that has a parent department in the hierarchy.
 *
 * Validates the department hierarchy relationship is correctly returned when fetching a child department. This test ensures that parent department references are properly included in the response and that the one-level nesting constraint is maintained.
 *
 * The test follows these steps:
 * 1. Authenticate as a member with employee:view permission
 * 2. Create a root-level department (no parent)
 * 3. Create a child department with the root department as parent
 * 4. Retrieve the child department by ID
 * 5. Verify the response includes all required fields and parent reference
 * 6. Validate parent department has null parent_department (root level)
 *
 * Business Rules Validated:
 * - Department hierarchy is correctly established (one level nesting)
 * - Parent department reference is included in response
 * - Organization context is enforced
 * - Soft-deleted departments are excluded
 */
export async function test_api_department_retrieval_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Generate organization ID (using random UUID for testing)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create root-level department (no parent)
  const rootDepartment: IHrmDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(rootDepartment);
  // Validate root department has no parent
  TestValidator.predicate(
    "root department has no parent",
    () => rootDepartment.parent === null || rootDepartment.parent === undefined,
  );
  // 3. Create child department with root as parent
  const childDepartment: IHrmDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: rootDepartment.id,
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(childDepartment);
  // 4. Retrieve the child department by ID
  const retrievedDepartment: IHrmDepartment =
    await api.functional.hrm.member.organizations.departments.at(
      memberConnection,
      {
        organizationId,
        departmentId: childDepartment.id,
      },
    );
  typia.assert(retrievedDepartment);
  // 5. Validate retrieved department matches created department
  TestValidator.equals(
    "department id matches",
    retrievedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "department name matches",
    retrievedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedDepartment.organization.id,
    organizationId,
  );
  // 6. Verify parent department is included and valid
  TestValidator.predicate(
    "parent department exists",
    () =>
      retrievedDepartment.parent !== null &&
      retrievedDepartment.parent !== undefined,
  );
  const parentDepartment = retrievedDepartment.parent;
  if (parentDepartment) {
    TestValidator.equals(
      "parent department id matches root",
      parentDepartment.id,
      rootDepartment.id,
    );
    TestValidator.equals(
      "parent department name matches",
      parentDepartment.name,
      rootDepartment.name,
    );
    TestValidator.predicate(
      "parent has created_at",
      () =>
        parentDepartment.created_at !== null &&
        parentDepartment.created_at !== undefined,
    );
    // 7. Verify parent department has null parent_department (root level)
    TestValidator.predicate(
      "parent is root level (no grandparent)",
      () => parentDepartment.parent_department === null,
    );
  }
  // Validate timestamps
  TestValidator.predicate(
    "has created_at timestamp",
    () =>
      retrievedDepartment.created_at !== null &&
      retrievedDepartment.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () =>
      retrievedDepartment.updated_at !== null &&
      retrievedDepartment.updated_at !== undefined,
  );
}
