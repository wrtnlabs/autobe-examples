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
 * Test successful deletion of a top-level department.
 *
 * Validates the complete department lifecycle including member registration, organization creation, department creation, and department deletion. Ensures that the department can be successfully deleted and that the API returns the expected 204 No Content response.
 *
 * The test verifies that a member can create an organization, establish a department within that organization, and then remove the department through the delete endpoint. This represents the primary success path for department removal operations.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an organization with required configuration (name, currency, timezone, fiscal_start_month).
 * 3. Member creates a top-level department within the organization with a unique name.
 * 4. Member deletes the department using the erase endpoint.
 * 5. Validates that department creation returned complete entity with null parentDepartment and deletion completed successfully.
 */
export async function test_api_department_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
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
  // 3. Create department within organization
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // Validate department structure
  TestValidator.equals("department id exists", department.id !== null, true);
  TestValidator.equals(
    "department name matches",
    department.name !== null,
    true,
  );
  TestValidator.equals(
    "top-level department has no parent",
    department.parentDepartment,
    null,
  );
  // 4. Delete the department
  await api.functional.hrmPlatform.member.organizations.departments.erase(
    memberConnection,
    {
      organizationId: organization.id,
      departmentId: department.id,
    },
  );
  // 5. Successful completion validates 204 No Content response
}
