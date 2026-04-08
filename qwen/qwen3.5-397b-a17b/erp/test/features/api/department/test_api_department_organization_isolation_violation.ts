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
 * Test department organization isolation violation returns 404 for cross-organization access.
 *
 * Validates that the multi-tenancy data isolation is strictly enforced when accessing departments. When a member attempts to retrieve a department using a department ID from Organization A but with Organization B's organization ID in the path, the API must return 404 Not Found rather than exposing the department data or returning 403 Forbidden.
 *
 * This security pattern prevents information disclosure about the existence of departments in other organizations. The 404 response indicates the resource does not exist in the requested organization context, maintaining strict organizational boundaries.
 *
 * 1. Member joins the platform and receives authentication tokens.
 * 2. Member creates Organization A with unique name and configuration.
 * 3. Member creates a department within Organization A.
 * 4. Member creates Organization B with different unique name and configuration.
 * 5. Member attempts to access Organization A's department using Organization B's ID.
 * 6. Validates that the API returns 404 Not Found, confirming isolation enforcement.
 */
export async function test_api_department_organization_isolation_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create Organization A
  const organizationA =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Organization A - ${RandomGenerator.alphabets(8)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationA);
  // 3. Create department in Organization A
  const departmentInOrgA =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organizationA.id,
        },
        body: {
          name: `Department A - ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(departmentInOrgA);
  // 4. Create Organization B
  const organizationB =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Organization B - ${RandomGenerator.alphabets(8)}`,
          currency: "EUR",
          timezone: "America/New_York",
          fiscal_start_month: 4,
        },
      },
    );
  typia.assert(organizationB);
  // 5. Attempt to access Organization A's department using Organization B's ID
  // This should return 404 Not Found due to multi-tenancy isolation
  await TestValidator.httpError(
    "cross-organization department access returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.organizations.departments.at(
        memberConnection,
        {
          organizationId: organizationB.id,
          departmentId: departmentInOrgA.id,
        },
      );
    },
  );
}
