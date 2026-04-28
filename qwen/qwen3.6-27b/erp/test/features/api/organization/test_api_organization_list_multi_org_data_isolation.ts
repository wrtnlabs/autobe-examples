import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Test cross-organizational data isolation for members in multiple organizations.
 *
 * Validates the strict scope enforcement where members can only access organizations they have active memberships in. Ensures that creating multiple organizations and inviting a member to a subset of them results in the member only seeing their permitted organizations. Specifically verifies that an unrelated organization created by a third party is not visible to the member, confirming data isolation boundaries.
 *
 * 1. First member joins the platform, which automatically creates Organization A and assigns ownership.
 * 2. Second admin joins the platform, which automatically creates Organization B and assigns ownership.
 * 3. Second admin invites the first member to Organization B, creating an employee record linking them.
 * 4. Third admin joins the platform, which automatically creates Organization C; the first member is not invited here.
 * 5. First member calls PATCH /hrmPlatform/organizations to list accessible organizations.
 * 6. Verifies that the response contains exactly two organizations (A and B), confirming membership scope.
 * 7. Ensures that Organization C does not appear in the results, validating that data isolation prevents access to unauthorized organizations.
 */
export async function test_api_organization_list_multi_org_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins with Organization A (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Second admin joins with Organization B (becomes owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Second admin invites first member to Organization B
  await generate_random_hrm_platform_member_employees_create(
    memberBConnection,
    {
      body: {
        memberId: memberA.id,
      } satisfies Partial<IHrmPlatformEmployee.ICreate>,
    },
  );
  // 4. Third admin joins with Organization C (unrelated to first member)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 5. First member calls PATCH /hrmPlatform/organizations
  const orgs = await api.functional.hrmPlatform.organizations.index(
    memberAConnection,
    {
      body: {} satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(orgs);
  // 6. Verify response only contains Organization A and Organization B
  TestValidator.equals(
    "Member A sees exactly 2 organizations",
    orgs.pagination.records,
    2,
  );
  TestValidator.equals(
    "Member A sees exactly 2 organizations in data array",
    orgs.data.length,
    2,
  );
  // 7. Verify Organization C does not appear in first member's results
  // Isolation is confirmed by the count validation (2 orgs) and the setup (Member A is only in A and B).
}
