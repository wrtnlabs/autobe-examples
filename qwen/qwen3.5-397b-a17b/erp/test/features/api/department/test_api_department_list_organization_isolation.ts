import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
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
 * Test organization data isolation to verify multi-tenancy boundaries.
 *
 * Validates that department data is strictly isolated between organizations in the multi-tenancy platform. The test creates two separate member accounts, each with their own organization, and verifies that members can only access departments within their own organization.
 *
 * The test scenario uses overlapping department names (e.g., both organizations have an 'Engineering' department) to ensure that data isolation is enforced by organization ID, not by department name matching. This confirms the security model prevents cross-organization data access.
 *
 * 1. Register member A and create organization A with multiple departments.
 * 2. Register member B and create organization B with departments having the same names as organization A.
 * 3. As member A, list departments in organization A and verify only organization A's departments are returned.
 * 4. Validate that organization B's departments are not visible to member A, confirming strict data isolation.
 * 5. Verify department IDs from different organizations are distinct even when names match.
 */
export async function test_api_department_list_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A and create organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: `Organization A - ${RandomGenerator.name()}`,
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(orgA);
  // Create departments in organization A
  const deptA1 =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberAConnection,
      {
        params: { organizationId: orgA.id },
        body: {
          name: "Engineering",
          description: "Engineering department for Organization A",
        },
      },
    );
  typia.assert(deptA1);
  const deptA2 =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberAConnection,
      {
        params: { organizationId: orgA.id },
        body: {
          name: "Marketing",
          description: "Marketing department for Organization A",
        },
      },
    );
  typia.assert(deptA2);
  // 2. Register member B and create organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: `Organization B - ${RandomGenerator.name()}`,
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(orgB);
  // Create departments in organization B with SAME names as organization A
  const deptB1 =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberBConnection,
      {
        params: { organizationId: orgB.id },
        body: {
          name: "Engineering",
          description: "Engineering department for Organization B",
        },
      },
    );
  typia.assert(deptB1);
  const deptB2 =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberBConnection,
      {
        params: { organizationId: orgB.id },
        body: {
          name: "Marketing",
          description: "Marketing department for Organization B",
        },
      },
    );
  typia.assert(deptB2);
  // 3. As member A, list departments in organization A
  const departmentsInOrgA =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberAConnection,
      {
        organizationId: orgA.id,
        body: {},
      },
    );
  typia.assert(departmentsInOrgA);
  // 4. Validate that only organization A's departments are returned
  TestValidator.equals(
    "department count in org A",
    departmentsInOrgA.data.length,
    2,
  );
  const orgADepartmentIds = departmentsInOrgA.data.map((d) => d.id);
  TestValidator.predicate(
    "contains Engineering from org A",
    orgADepartmentIds.includes(deptA1.id),
  );
  TestValidator.predicate(
    "contains Marketing from org A",
    orgADepartmentIds.includes(deptA2.id),
  );
  // 5. Verify organization B's departments are NOT visible to member A
  TestValidator.predicate(
    "does not contain Engineering from org B",
    !orgADepartmentIds.includes(deptB1.id),
  );
  TestValidator.predicate(
    "does not contain Marketing from org B",
    !orgADepartmentIds.includes(deptB2.id),
  );
  // 6. Verify department IDs are distinct across organizations
  TestValidator.notEquals(
    "Engineering dept IDs differ between orgs",
    deptA1.id,
    deptB1.id,
  );
  TestValidator.notEquals(
    "Marketing dept IDs differ between orgs",
    deptA2.id,
    deptB2.id,
  );
  // 7. Verify department names match but belong to different organizations
  TestValidator.equals(
    "Engineering dept names match",
    deptA1.name,
    deptB1.name,
  );
  TestValidator.equals("Marketing dept names match", deptA2.name, deptB2.name);
}
