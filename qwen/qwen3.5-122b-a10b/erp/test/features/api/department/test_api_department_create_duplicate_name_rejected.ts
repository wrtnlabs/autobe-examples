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
 * Test duplicate department name validation rejection.
 *
 * Validates that attempting to create a department with a name that already exists within an organization is rejected by the system. This test ensures the business rule enforcing unique department names per organization is properly enforced, preventing duplicate department entries that could cause organizational structure confusion.
 *
 * The test follows this workflow:
 * 1. Register and authenticate a new member user
 * 2. Generate a test organization ID (UUID format)
 * 3. Create an initial department successfully
 * 4. Attempt to create a second department with the same name
 * 5. Validate that the duplicate creation attempt throws an error
 *
 * This validates the unique constraint on (organization_id, name) in the hrm_departments table.
 */
export async function test_api_department_create_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate organization ID for testing (UUID format)
  // Note: Organization creation API not available in provided SDK functions
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create first department successfully
  const departmentName = RandomGenerator.name(2);
  const firstDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(firstDepartment);
  TestValidator.equals(
    "department created",
    firstDepartment.name,
    departmentName,
  );
  // 4. Attempt to create second department with same name - should fail
  await TestValidator.error("duplicate department name rejected", async () => {
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName, // Same name as first department
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  });
}
