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
 * Verify that an authenticated member can successfully log out, terminating their current session.
 *
 * Validates the complete logout flow: session establishment through member registration and authentication, session termination via the logout endpoint, and verification that the invalidated JWT access token is rejected on subsequent authenticated requests.
 *
 * 1. Member registers and authenticates via join to establish an active session with JWT access and refresh tokens.
 * 2. Member calls the logout endpoint — the SDK returns void confirming 204 No Content and successful session termination.
 * 3. Attempts another authenticated request with the same (now-invalidated) token and verifies 401 Unauthorized rejection.
 */
export async function test_api_logout_successful_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Call logout and verify successful session termination (204 No Content)
  await api.functional.erpHrm.member.logout(memberConnection);
  // 3. Verify token is invalidated — subsequent authenticated request with same token must be rejected with 401
  await TestValidator.httpError(
    "logout invalidates access token",
    401,
    async () => {
      await api.functional.erpHrm.member.logout(memberConnection);
    },
  );
}
