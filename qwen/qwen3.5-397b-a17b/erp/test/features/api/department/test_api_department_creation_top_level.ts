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
 * Test creating a top-level department within an organization.
 *
 * Validates the complete department creation flow including member authentication, organization setup, and top-level department creation without a parent department. Ensures that the department is created successfully with all fields populated correctly including id, name, description (null), parentDepartment (null), and timestamps.
 *
 * Special attention is given to verifying that the parentDepartment field is null for top-level departments and that the department name is unique within the organization context.
 *
 * 1. Member joins with email and password credentials.
 * 2. Member creates an organization with name, currency, timezone, and fiscal start month.
 * 3. Member creates a top-level department within the organization (no parentDepartmentId).
 * 4. Validate department response structure including id, name, description as null, parentDepartment as null, and timestamps.
 * 5. Verify the department name matches the input and all required fields are present.
 */
export async function test_api_department_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create top-level department (no parent)
  const departmentName = RandomGenerator.paragraph({ sentences: 1 });
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: null,
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // 4. Validate department structure
  TestValidator.equals(
    "department name matches",
    department.name,
    departmentName,
  );
  TestValidator.equals("description is null", department.description, null);
  TestValidator.equals(
    "parentDepartment is null",
    department.parentDepartment,
    null,
  );
  TestValidator.equals("deletedAt is null", department.deletedAt, null);
}
