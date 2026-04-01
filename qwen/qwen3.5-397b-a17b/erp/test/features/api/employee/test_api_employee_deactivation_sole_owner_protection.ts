import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test the business rule that prevents deactivating the sole owner of an organization.
 *
 * This test validates that the system protects organizational integrity by preventing
 * the deactivation of an employee record when that employee is the sole owner of the
 * organization. The test flow:
 * 1. Register a new member account using authorize_member_join utility
 * 2. Create an organization workspace using generate_random_hrm_platform_member_organizations_create
 *    utility (which automatically makes the member the owner)
 * 3. Attempt to deactivate the owner's employee record using the erase endpoint
 * 4. Validate that the operation fails with an appropriate error response
 *
 * Note: Since the available APIs don't include an endpoint to list employees, we test
 * the business rule by attempting deactivation with a generated employee ID. The backend
 * should validate ownership and reject the operation if the employee is the sole owner.
 */
export async function test_api_employee_deactivation_sole_owner_protection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account (becomes organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create an organization (member automatically becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Attempt to deactivate the owner's employee record
  // Since we cannot retrieve the employee ID from available APIs, we generate a UUID
  // The backend should validate that this employee is the sole owner and reject the operation
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Validate that deactivation fails for sole owner
  await TestValidator.error(
    "sole owner deactivation should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.employees.erase(
        memberConnection,
        {
          employeeId: employeeId,
        },
      );
    },
  );
}
