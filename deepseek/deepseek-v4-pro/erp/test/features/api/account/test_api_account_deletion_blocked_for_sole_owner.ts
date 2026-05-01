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
 * Test that account deletion is blocked when the member is the sole owner of an organization.
 *
 * Verifies that a member who is the sole owner of at least one active organization cannot delete their own account. The server must reject the deletion request with an appropriate error status — either 403 Forbidden or 409 Conflict — indicating that the member must first transfer ownership or delete the organization before deleting their account.
 *
 * This test ensures that organizations are never left without an owner, enforcing the ownership transfer requirement before account deletion can proceed.
 *
 * 1. A new member registers and authenticates through the join endpoint, becoming the sole owner of their default organization.
 * 2. The authenticated member attempts to delete their own account via the erase endpoint.
 * 3. The deletion request is rejected with HTTP 403 or 409, confirming sole-owner protection.
 */
export async function test_api_account_deletion_blocked_for_sole_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt account deletion — must be blocked for sole owner
  await TestValidator.httpError(
    "sole owner account deletion must be blocked",
    [403, 409],
    async () =>
      await api.functional.erpHrm.member.account.erase(memberConnection),
  );
}
