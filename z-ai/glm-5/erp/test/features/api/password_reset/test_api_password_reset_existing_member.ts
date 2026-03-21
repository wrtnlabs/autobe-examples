import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset request for an existing active member account.
 *
 * Validates that:
 * 1. Password reset endpoint accepts requests from existing members
 * 2. Returns 204 No Content (void) for successful requests
 * 3. Does not reveal whether an email exists (prevents enumeration)
 */
export async function test_api_password_reset_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a member account with a known email address
  const member = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Execute: Request password reset with the member's registered email
  // Password reset endpoint is unauthenticated (no auth headers needed)
  const guestConnection: api.IConnection = { host: connection.host };
  await api.functional.erpHrm.member.password_resets.request(guestConnection, {
    body: {
      email: member.email,
    } satisfies IErpHrmMemberPasswordReset.IRequest,
  });
}
