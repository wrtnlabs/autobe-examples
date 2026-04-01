import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test retrieving a child department that has a parent department, validating the one-level hierarchical structure.
 *
 * Test Steps:
 * 1. Authenticate as a member by joining the organization
 * 2. Create a parent department (top-level) within the organization
 * 3. Create a child department with the parent department assigned
 * 4. Retrieve the child department using its ID via GET /hrmPlatform/member/departments/{departmentId}
 * 5. Verify the hierarchical relationship is correctly returned
 *
 * Validation Points:
 * - Child department ID matches the requested ID
 * - parentDepartment field contains the parent department's ISummary object
 * - Parent department's id, name, and description match the created parent
 * - Parent department's parent field is null (one-level hierarchy enforced)
 * - Both departments belong to the same organization
 * - deleted_at is null for both departments (both are active)
 */
export async function test_api_department_retrieve_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child department with parent assigned
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Retrieve the child department
  const retrievedDepartment =
    await api.functional.hrmPlatform.member.departments.at(memberConnection, {
      departmentId: childDepartment.id,
    });
  typia.assert(retrievedDepartment);
  // 5. Validate hierarchical relationship
  TestValidator.equals(
    "child department ID matches",
    retrievedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name matches",
    retrievedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "child department description matches",
    retrievedDepartment.description,
    childDepartment.description,
  );
  // Validate parent department exists in response
  TestValidator.predicate(
    "parentDepartment exists",
    retrievedDepartment.parentDepartment !== null,
  );
  if (retrievedDepartment.parentDepartment !== null) {
    const parentSummary = retrievedDepartment.parentDepartment;
    // Validate parent department details match
    TestValidator.equals(
      "parent department ID matches",
      parentSummary.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent department name matches",
      parentSummary.name,
      parentDepartment.name,
    );
    TestValidator.equals(
      "parent department description matches",
      parentSummary.description,
      parentDepartment.description,
    );
    // Validate one-level hierarchy: parent's parent field should be null
    TestValidator.predicate(
      "parent has no parent (one-level hierarchy)",
      parentSummary.parent === null,
    );
  }
  // Validate both departments belong to same organization
  TestValidator.equals(
    "same organization",
    retrievedDepartment.organization.id,
    parentDepartment.organization.id,
  );
  // Validate both departments are active (not soft-deleted)
  TestValidator.predicate(
    "child department is active",
    retrievedDepartment.deleted_at === null,
  );
  TestValidator.predicate(
    "parent department is active",
    parentDepartment.deleted_at === null,
  );
}