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
 * Test that department updates support partial field modifications.
 *
 * This test validates that the PUT /hrmPlatform/admin/departments/{departmentId}
 * endpoint correctly handles partial updates where only some fields are provided
 * in the request body. It tests three scenarios:
 * 1. Updating only the name field
 * 2. Updating only the description field
 * 3. Clearing the description by setting it to null
 *
 * Each scenario verifies that unchanged fields retain their original values
 * and that the updated_at timestamp is refreshed on each modification.
 */
export async function test_api_department_update_partial_fields(
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
    },
  });
  // 2. Create initial department
  const department =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Engineering",
          description: "Initial description",
        },
      },
    );
  typia.assert(department);
  const initialUpdatedAt = department.updated_at;
  // 3. Scenario A: Update only name
  const updatedNameOnly =
    await api.functional.hrmPlatform.admin.departments.update(adminConnection, {
      departmentId: department.id,
      body: {
        name: "Engineering Team",
      } satisfies IHrmPlatformDepartment.IUpdate,
    });
  typia.assert(updatedNameOnly);
  TestValidator.equals(
    "name updated",
    updatedNameOnly.name,
    "Engineering Team",
  );
  TestValidator.equals(
    "description unchanged",
    updatedNameOnly.description,
    "Initial description",
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedNameOnly.updated_at !== initialUpdatedAt,
  );
  // 4. Scenario B: Update only description
  const updatedDescOnly =
    await api.functional.hrmPlatform.admin.departments.update(adminConnection, {
      departmentId: department.id,
      body: {
        description: "Updated description",
      } satisfies IHrmPlatformDepartment.IUpdate,
    });
  typia.assert(updatedDescOnly);
  TestValidator.equals(
    "name unchanged",
    updatedDescOnly.name,
    "Engineering Team",
  );
  TestValidator.equals(
    "description updated",
    updatedDescOnly.description,
    "Updated description",
  );
  TestValidator.predicate(
    "updated_at refreshed again",
    updatedDescOnly.updated_at !== updatedNameOnly.updated_at,
  );
  // 5. Scenario C: Clear description (set to null)
  const clearedDescription =
    await api.functional.hrmPlatform.admin.departments.update(adminConnection, {
      departmentId: department.id,
      body: {
        description: null,
      } satisfies IHrmPlatformDepartment.IUpdate,
    });
  typia.assert(clearedDescription);
  TestValidator.equals(
    "name still unchanged",
    clearedDescription.name,
    "Engineering Team",
  );
  TestValidator.equals(
    "description cleared",
    clearedDescription.description,
    null,
  );
  TestValidator.predicate(
    "updated_at refreshed again",
    clearedDescription.updated_at !== updatedDescOnly.updated_at,
  );
}
