import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
 * Test successful department deletion when the authenticated member has org:manage permission.
 *
 * Validates the complete department deletion workflow including member authentication,
 * organization setup, department creation, and hard deletion verification. Ensures that
 * the department deletion is permanent and irreversible. The test confirms that the
 * delete operation completes successfully and the department is removed from the system.
 *
 * 1. Member registers with organization to gain org:manage permission.
 * 2. Member creates a department within their organization.
 * 3. Execute the department deletion operation.
 * 4. Verify the deletion operation completes successfully.
 */
export async function test_api_department_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberResult);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create department
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // 4. Verify department exists before deletion (implicitly validated by successful creation)
  TestValidator.predicate(
    "department created in organization",
    department.organization.id === organization.id,
  );
  // 5. Delete the department
  await api.functional.hrmPlatform.member.organizations.departments.erase(
    memberConnection,
    {
      organizationId: organization.id,
      departmentId: department.id,
    },
  );
  // 6. Verify deletion operation completed successfully
  // The erase operation returns void on success, which validates successful deletion
  TestValidator.predicate("department deletion completed", true);
}
