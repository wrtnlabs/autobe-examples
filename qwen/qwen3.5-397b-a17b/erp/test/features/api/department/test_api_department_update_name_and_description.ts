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
 * Test successful department update operation with name and description changes.
 *
 * Validates the complete department update workflow including member authentication, organization creation, department creation, and department property modification. Ensures that the update operation correctly modifies the department's name and description while maintaining all other fields intact.
 *
 * The test verifies that the updated department entity includes all required fields with the new values reflected, and that the updatedAt timestamp is properly updated to reflect the modification time.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an organization with name, currency, timezone, and fiscal settings.
 * 3. Member creates a department within the organization with initial name and description.
 * 4. Member updates the department's name and description to new values.
 * 5. Validates that the response contains updated name, description, and updatedAt timestamp while preserving id, createdAt, and other fields.
 */
export async function test_api_department_update_name_and_description(
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
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create initial department
  const initialDepartment =
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
  typia.assert(initialDepartment);
  // 4. Update department name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: initialDepartment.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 5. Validate update results
  TestValidator.equals(
    "department id preserved",
    updatedDepartment.id,
    initialDepartment.id,
  );
  TestValidator.equals("name updated", updatedDepartment.name, newName);
  TestValidator.equals(
    "description updated",
    updatedDepartment.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updatedAt changed",
    updatedDepartment.updatedAt,
    initialDepartment.updatedAt,
  );
  TestValidator.equals(
    "createdAt preserved",
    updatedDepartment.createdAt,
    initialDepartment.createdAt,
  );
  TestValidator.predicate(
    "deletedAt is null",
    updatedDepartment.deletedAt === null,
  );
  TestValidator.equals(
    "parentDepartment preserved",
    updatedDepartment.parentDepartment,
    initialDepartment.parentDepartment,
  );
}
