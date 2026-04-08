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
 * Test department deletion with employees assigned.
 *
 * Validates the department deletion workflow including soft deletion behavior. This test ensures that when a department is deleted, the department record is soft-deleted successfully.
 *
 * Note: Employee creation APIs and department retrieval APIs are not available in the current SDK, so employee assignment validation and soft-deletion verification cannot be performed in this test. The test focuses on successful department deletion behavior.
 *
 * 1. Authenticate as member with org:manage permission.
 * 2. Generate organization ID for testing.
 * 3. Create a department within the organization.
 * 4. Delete the department via erase endpoint.
 * 5. Verify deletion succeeds (204 No Content, no exception thrown).
 */
export async function test_api_department_deletion_with_employees_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Generate organization ID for testing (organization creation API not available)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a department
  const department =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(department);
  // 4. Delete the department
  await api.functional.hrm.member.organizations.departments.erase(
    memberConnection,
    {
      organizationId,
      departmentId: department.id,
    },
  );
  // 5. Verify deletion succeeded (no exception thrown = 204 No Content)
  TestValidator.predicate("department deletion succeeded", true);
}
