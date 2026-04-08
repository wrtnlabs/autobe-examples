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
 * Test retrieval of a nested department that has a parent department, validating one-level hierarchy support.
 *
 * Validates the complete department hierarchy flow including member authentication, organization creation, parent department setup, child department creation with parent reference, and individual department retrieval. Ensures that the parentDepartment relation is correctly populated and that the one-level hierarchy constraint is enforced.
 *
 * Special attention is given to verifying that the parent department's parentDepartment field is null (top-level), while the child department's parentDepartment field contains the parent's ISummary with id, name, description, and created_at.
 *
 * 1. Member joins the platform with email and password credentials.
 * 2. Member creates an organization with name, currency, timezone, and fiscal settings.
 * 3. Member creates a top-level parent department without parent reference.
 * 4. Member creates a child department referencing the parent department.
 * 5. Retrieves the child department and validates parentDepartment relation.
 * 6. Verifies parent department is top-level (parentDepartment is null).
 * 7. Confirms child department's name and description match creation data.
 */
export async function test_api_department_retrieve_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create parent department (top-level, no parent)
  const parentDepartmentName = RandomGenerator.name();
  const parentDepartmentDescription = RandomGenerator.paragraph({
    sentences: 2,
  });
  const parentDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: parentDepartmentName,
          description: parentDepartmentDescription,
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 4. Create child department with parent reference
  const childDepartmentName = RandomGenerator.name();
  const childDepartmentDescription = RandomGenerator.paragraph({
    sentences: 2,
  });
  const childDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: childDepartmentName,
          description: childDepartmentDescription,
          parentDepartmentId: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 5. Retrieve child department
  const retrievedDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.at(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: childDepartment.id,
      },
    );
  typia.assert(retrievedDepartment);
  // 6. Validate child department data matches creation
  TestValidator.equals(
    "child department id",
    retrievedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name",
    retrievedDepartment.name,
    childDepartmentName,
  );
  TestValidator.equals(
    "child department description",
    retrievedDepartment.description,
    childDepartmentDescription,
  );
  // 7. Validate parentDepartment relation exists and contains correct data
  TestValidator.predicate(
    "parentDepartment exists",
    retrievedDepartment.parentDepartment !== null,
  );
  TestValidator.equals(
    "parent department id",
    retrievedDepartment.parentDepartment!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent department name",
    retrievedDepartment.parentDepartment!.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "parent department description",
    retrievedDepartment.parentDepartment!.description,
    parentDepartment.description,
  );
  // 8. Validate parent is top-level (parentDepartment is null)
  TestValidator.predicate(
    "parent is top-level",
    parentDepartment.parentDepartment === null,
  );
}