import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that erasure of the sole remaining Owner of an organization is blocked with 409 Conflict.
 *
 * Validates the business rule that at least one Owner must always remain in the organization. When a member joins, they are automatically assigned the Owner role as the sole employee of their newly created organization. Attempting to erase this sole Owner must be rejected.
 *
 * 1. Authenticate as a member via join — creates member account and organization, with the member as sole Owner.
 * 2. Attempt to erase the owner's own employee record using the member ID as the employee ID.
 * 3. Verify the server returns 409 Conflict, preserving the employee record intact.
 */
export async function test_api_employee_erase_sole_owner_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member — creates account, organization, and sole Owner employee record
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2 & 3. Attempt to erase the sole Owner — must return 409 Conflict
  await TestValidator.httpError(
    "sole owner cannot be erased without a successor Owner assigned",
    409,
    async () =>
      await api.functional.erpHrm.member.employees.erase(memberConnection, {
        employeeId: member.id,
      }),
  );
}
