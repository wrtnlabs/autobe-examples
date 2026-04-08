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
 * Test successful retrieval of a department by ID within the member's organization context.
 *
 * Validates the complete department retrieval workflow including member authentication, organization creation, department creation, and department retrieval. Ensures that the department is correctly returned with all required fields and proper hierarchical structure.
 *
 * Special attention is given to verifying that top-level departments have null parentDepartment, all audit timestamps are present, and the department name matches the input data.
 *
 * 1. Member joins the platform with email and password credentials.
 * 2. Member creates an organization with name, currency, timezone, and fiscal start month.
 * 3. Member creates a top-level department within the organization.
 * 4. Retrieves the created department using the department ID.
 * 5. Validates department data integrity including name match, null parent, and timestamp presence.
 */
export async function test_api_department_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
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
      {},
    );
  typia.assert(organization);
  // 3. Create top-level department
  const departmentName = RandomGenerator.name();
  const departmentDescription = RandomGenerator.paragraph({ sentences: 2 });
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: departmentName,
          description: departmentDescription,
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Retrieve the department
  const retrieved =
    await api.functional.hrmPlatform.member.organizations.departments.at(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: department.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate department data
  TestValidator.equals("department id matches", retrieved.id, department.id);
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    departmentName,
  );
  TestValidator.equals(
    "department description matches",
    retrieved.description,
    departmentDescription,
  );
  TestValidator.equals(
    "parent department is null for top-level",
    retrieved.parentDepartment,
    null,
  );
  TestValidator.predicate("createdAt exists", retrieved.createdAt !== null);
  TestValidator.predicate("updatedAt exists", retrieved.updatedAt !== null);
  TestValidator.equals(
    "deletedAt is null for active department",
    retrieved.deletedAt,
    null,
  );
}
