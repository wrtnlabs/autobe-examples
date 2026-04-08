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
 * Test retrieving a root-level department that has no parent department.
 *
 * Validates that departments created without a parent reference correctly return null for the parent_department field. This ensures the one-level hierarchy nesting is properly maintained and that root-level departments are distinguishable from nested departments.
 *
 * The test creates a member account, establishes an organization context, creates a department without specifying a parent, retrieves the department, and validates that the parent reference is explicitly null rather than missing or undefined.
 *
 * 1. Authenticate as a member using email and password credentials.
 * 2. Generate organization UUID for department context (organization creation is outside test scope).
 * 3. Create a root-level department with no parent_department_id specified.
 * 4. Retrieve the department by its UUID identifier.
 * 5. Validate the response structure includes all required fields.
 * 6. Verify parent_department is explicitly null (not undefined or missing).
 * 7. Confirm organization reference is correctly populated.
 * 8. Validate timestamp fields are present and properly formatted.
 */
export async function test_api_department_retrieval_without_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate organization UUID (organization creation is outside this test scope)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create root-level department (no parent)
  const departmentConnection: api.IConnection = { host: connection.host };
  // Copy auth token from memberConnection
  departmentConnection.headers = { ...memberConnection.headers };
  const department =
    await generate_random_hrm_member_organizations_departments_create(
      departmentConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          // Explicitly omit parent_department_id to create root-level department
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(department);
  // 4. Retrieve the department
  const retrieved =
    await api.functional.hrm.member.organizations.departments.at(
      departmentConnection,
      {
        organizationId,
        departmentId: department.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response structure
  TestValidator.equals("department id matches", retrieved.id, department.id);
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    department.name,
  );
  TestValidator.predicate(
    "has organization reference",
    retrieved.organization !== null && retrieved.organization !== undefined,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
  );
  // 6. Verify parent is explicitly null for root-level department
  TestValidator.equals("parent_department is null", retrieved.parent, null);
  // 7. Verify organization reference is correct
  TestValidator.equals(
    "organization id matches",
    retrieved.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization name matches",
    retrieved.organization.name,
    department.organization.name,
  );
}
