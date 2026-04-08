import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test department parent assignment update workflow with hierarchy validation.
 *
 * Validates the complete department hierarchy setup including member authentication, organization creation, parent and child department creation, and parent assignment update. Ensures that the department update operation correctly establishes the parent-child relationship and returns the department with the parentDepartment relation properly populated.
 *
 * Special attention is given to verifying that the parent department belongs to the same organization and that the one-level nesting constraint is maintained. The test confirms that the updated department's parentDepartment field contains the correct parent department summary with id, name, and description.
 *
 * 1. Member registers and authenticates with email and credentials.
 * 2. Creates an organization to establish the operational context.
 * 3. Creates a parent department candidate as a top-level department.
 * 4. Creates a child department as a top-level department initially.
 * 5. Updates the child department to assign the parent department.
 * 6. Validates the update succeeds and parentDepartment relation is populated correctly.
 * 7. Verifies the hierarchy is correctly established with one-level nesting.
 */
export async function test_api_department_update_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create parent department candidate (top-level)
  const parentDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(parentDepartment);
  TestValidator.predicate(
    "parent is top-level",
    parentDepartment.parentDepartment === null,
  );
  // 4. Create child department (initially top-level)
  const childDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(childDepartment);
  TestValidator.predicate(
    "child is initially top-level",
    childDepartment.parentDepartment === null,
  );
  // 5. Update child department to assign parent
  const updatedDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: childDepartment.id,
        body: {
          parentDepartmentId: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 6. Validate hierarchy is established
  TestValidator.predicate(
    "parentDepartment is populated",
    updatedDepartment.parentDepartment !== null,
  );
  // 7. Verify parent department details match the created parent
  if (updatedDepartment.parentDepartment !== null) {
    TestValidator.equals(
      "parent id matches",
      updatedDepartment.parentDepartment.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      updatedDepartment.parentDepartment.name,
      parentDepartment.name,
    );
    TestValidator.equals(
      "parent description matches",
      updatedDepartment.parentDepartment.description,
      parentDepartment.description,
    );
  }
  // 8. Verify the updated department retains its own identity
  TestValidator.equals(
    "child id unchanged",
    updatedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child name unchanged",
    updatedDepartment.name,
    childDepartment.name,
  );
}
