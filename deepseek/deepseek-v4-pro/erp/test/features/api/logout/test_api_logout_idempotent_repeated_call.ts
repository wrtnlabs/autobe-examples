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
 * Test that the logout operation is idempotent when called repeatedly on a terminated session.
 *
 * Validates the idempotent behavior mandated by the specification: when no valid session exists, the operation treats it as success rather than reporting an error. This ensures that clients can safely call logout without worrying about the current session state.
 *
 * 1. Member joins to establish an authenticated session with valid JWT tokens.
 * 2. First logout call terminates the session successfully (204 No Content).
 * 3. Second logout call with the now-invalidated token also returns 204 No Content, confirming idempotent behavior.
 */
export async function test_api_logout_idempotent_repeated_call(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. First logout — terminates the session
  await api.functional.erpHrm.member.logout(memberConnection);
  // 3. Second logout — idempotent, should also succeed with 204
  await api.functional.erpHrm.member.logout(memberConnection);
}
