import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
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
 * Test that retrieving a password reset token with a nonexistent UUID returns 404.
 *
 * Validates that the password reset token retrieval endpoint correctly returns a
 * 404 Not Found response when queried with a randomly generated UUID that does not
 * correspond to any existing password reset record. This ensures that non-existent
 * or already-consumed tokens are properly rejected without leaking internal system
 * details.
 *
 * 1. Member joins through the registration endpoint to obtain an authenticated session.
 * 2. A random UUID is generated that does not exist in the password reset records.
 * 3. The retrieval endpoint is called with the nonexistent ID and a 404 is verified.
 */
export async function test_api_password_reset_token_nonexistent_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that does not correspond to any password reset
  const nonexistentResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve and verify 404
  await TestValidator.httpError(
    "nonexistent password reset token should return 404",
    404,
    async () =>
      api.functional.erpHrm.member.password_resets.at(memberConnection, {
        resetId: nonexistentResetId,
      }),
  );
}
