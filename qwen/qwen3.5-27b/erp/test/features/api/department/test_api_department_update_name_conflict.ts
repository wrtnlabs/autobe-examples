import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test the business rule that department names must be unique within an organization.
 *
 * This test validates that attempting to update a department's name to match
 * an existing department name results in a 409 Conflict error, ensuring the
 * uniqueness constraint is enforced at the application level.
 */
export async function test_api_department_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create first department with name 'Engineering'
  const engineeringDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Engineering",
          description: "Engineering department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(engineeringDepartment);
  // 3. Create second department with name 'Marketing'
  const marketingDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Marketing",
          description: "Marketing department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(marketingDepartment);
  // 4. Attempt to update Marketing department's name to 'Engineering' (conflict)
  // This should fail with 409 Conflict because 'Engineering' already exists
  await TestValidator.httpError(
    "should return 409 Conflict when department name conflicts with existing department",
    409,
    async () =>
      await api.functional.hrmPlatform.admin.departments.update(
        adminConnection,
        {
          departmentId: marketingDepartment.id,
          body: {
            name: "Engineering",
          } satisfies IHrmPlatformDepartment.IUpdate,
        },
      ),
  );
  // 5. Verify that a valid update (non-conflicting name) still works
  const updatedMarketingDepartment =
    await api.functional.hrmPlatform.admin.departments.update(adminConnection, {
      departmentId: marketingDepartment.id,
      body: {
        name: "Marketing Updated",
      } satisfies IHrmPlatformDepartment.IUpdate,
    });
  typia.assert(updatedMarketingDepartment);
  TestValidator.equals(
    "Marketing department name was successfully updated to non-conflicting name",
    updatedMarketingDepartment.name,
    "Marketing Updated",
  );
  TestValidator.equals(
    "Marketing department ID remains the same after successful update",
    updatedMarketingDepartment.id,
    marketingDepartment.id,
  );
  // 6. Verify Engineering department was not affected by the failed update attempt
  // Attempt to update Engineering to verify it still exists with original name
  const updatedEngineeringDepartment =
    await api.functional.hrmPlatform.admin.departments.update(adminConnection, {
      departmentId: engineeringDepartment.id,
      body: {
        name: "Engineering Updated",
      } satisfies IHrmPlatformDepartment.IUpdate,
    });
  typia.assert(updatedEngineeringDepartment);
  TestValidator.equals(
    "Engineering department can still be updated (was not affected by conflict)",
    updatedEngineeringDepartment.name,
    "Engineering Updated",
  );
}
