import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

/**
 * Test that a deleted member's profile is not accessible.
 *
 * Validates that when a member permanently deletes their account (soft-delete via setting deleted_at), their profile becomes inaccessible to other members in the same organization. The system must return 404 Not Found, treating soft-deleted accounts as non-existent. This also verifies that the response does not mistakenly return 403, which would imply the member still exists but is outside the organization.
 *
 * 1. Member A registers and authenticates — creates an account with an organization.
 * 2. Member B registers and authenticates — creates a separate account.
 * 3. Member A invites Member B to their organization using Member B's email address.
 * 4. Member B permanently deletes their own account via the account deletion endpoint.
 * 5. Member A attempts to retrieve Member B's profile — expects 404 Not Found.
 */
export async function test_api_member_profile_deleted_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member B registers and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A adds Member B to their organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    { body: { email: memberB.email } },
  );
  typia.assert(employee);
  // 4. Member B permanently deletes their account
  await api.functional.erpHrm.member.account.erase(memberBConnection);
  // 5. Member A attempts to retrieve Member B's profile — expects 404 Not Found
  await TestValidator.httpError(
    "deleted member profile returns 404",
    404,
    async () => {
      await api.functional.erpHrm.members.at(memberAConnection, {
        memberId: memberB.id,
      });
    },
  );
}
