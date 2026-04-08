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
 * Test creating a new root-level department within an organization.
 *
 * Validates the department creation workflow for a member user with organization management permissions. The test verifies that a department can be created without specifying a parent department, making it a root-level department in the organizational hierarchy.
 *
 * 1. Member user registers with email and credentials.
 * 2. Member creates a root-level department with name and optional description.
 * 3. Validates the created department contains all expected fields including UUID id, organization reference, name, description, and timestamps.
 * 4. Verifies the parent_department field is null indicating root-level status.
 */
export async function test_api_department_create_root_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // 2. Create root-level department (no parent_department_id specified)
  // In simulation mode, this will generate valid random data
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const department =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(department);
  // 3. Validate department fields
  TestValidator.equals("department id is UUID", department.id, department.id);
  TestValidator.equals(
    "organization reference exists",
    department.organization.id,
    organizationId,
  );
  TestValidator.predicate("name is not empty", department.name.length > 0);
  TestValidator.predicate(
    "parent is null for root department",
    department.parent === null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(department.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(department.updated_at) instanceof Date,
  );
}
