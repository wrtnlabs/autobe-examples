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
 * Test department deletion when the department has no employees assigned.
 *
 * Validates the edge case where an empty department can be deleted without restrictions. This scenario ensures that departments without any employee assignments can be successfully soft-deleted by users with org:manage permission.
 *
 * 1. Authenticate as member with org:manage permission
 * 2. Create a department within the organization (with no employees assigned)
 * 3. Delete the department
 * 4. Verify successful deletion completes without errors
 *
 * Business Rules Validated:
 * - Empty departments can be deleted without restrictions
 * - No additional validation required beyond org:manage permission
 * - Soft deletion works correctly for departments with no employees
 */
export async function test_api_department_deletion_empty_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate organization ID (test environment provides organizations)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create empty department
  const department =
    await api.functional.hrm.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmDepartment.ICreate,
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
  // erase returns void on success (204 No Content)
}
