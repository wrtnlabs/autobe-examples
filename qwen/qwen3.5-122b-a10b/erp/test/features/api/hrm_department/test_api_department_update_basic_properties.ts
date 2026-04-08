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
 * Test updating a department's basic properties while maintaining root-level status.
 *
 * Validates the department update endpoint by modifying name and description fields while keeping the department as a root-level department (no parent). The test ensures that the update operation correctly persists changes and returns the complete updated department entity with proper timestamp handling.
 *
 * The test verifies critical timestamp behavior where created_at remains immutable while updated_at reflects the modification time. This confirms proper audit trail maintenance for department records.
 *
 * 1. Authenticate member user via email/password registration.
 * 2. Create a root-level department with initial name and description.
 * 3. Update the department with new name and description values.
 * 4. Validate the response structure matches IHrmDepartment type.
 * 5. Verify created_at timestamp equals the original creation time.
 * 6. Verify updated_at timestamp is newer than the original.
 * 7. Confirm the updated name and description match the input values.
 */
export async function test_api_department_update_basic_properties(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create a root-level department
  const organizationId = auth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member must belong to at least one organization");
  }
  const originalDepartment: IHrmDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(originalDepartment);
  // Store original timestamps for validation
  const originalCreatedAt = originalDepartment.created_at;
  const originalUpdatedAt = originalDepartment.updated_at;
  // 3. Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update the department with new name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedDepartment: IHrmDepartment =
    await api.functional.hrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId,
        departmentId: originalDepartment.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 5. Validate response structure and content
  TestValidator.equals(
    "department id unchanged",
    updatedDepartment.id,
    originalDepartment.id,
  );
  TestValidator.equals(
    "organization id unchanged",
    updatedDepartment.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "updated name matches input",
    updatedDepartment.name,
    newName,
  );
  TestValidator.equals(
    "updated description matches input",
    updatedDepartment.description,
    newDescription,
  );
  // 6. Validate timestamp behavior
  TestValidator.equals(
    "created_at remains unchanged",
    updatedDepartment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is newer",
    updatedDepartment.updated_at > originalUpdatedAt,
  );
  // 7. Verify department remains root-level (no parent)
  TestValidator.equals(
    "parent_department is null",
    updatedDepartment.parent,
    null,
  );
}
