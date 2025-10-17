import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Requesting password reset for an existing member should succeed with a
 * generic, non-enumerating acknowledgement and must be accessible without
 * authentication.
 *
 * Steps
 *
 * 1. Provision a member via join to obtain a real, existing email.
 * 2. Create an unauthenticated connection clone (headers: {} only).
 * 3. Call POST /auth/member/password/reset with the existing email.
 * 4. Validate returned IEconDiscussMember.ISecurityEvent via typia.assert.
 * 5. Ensure message does not leak the submitted email (non-enumeration).
 * 6. Ensure code/message are non-empty and timestamp is recent.
 */
export async function test_api_member_password_reset_request_existing_email_non_enumerating(
  connection: api.IConnection,
) {
  // 1) Provision a member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName: string = RandomGenerator.name();

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(authorized);

  // 2) Unauthenticated connection clone
  const unauth: api.IConnection = { ...connection, headers: {} };

  // 3) Initiate password reset for the existing email
  const startedAt: number = Date.now();
  const ack: IEconDiscussMember.ISecurityEvent =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      unauth,
      {
        body: {
          email,
        } satisfies IEconDiscussMember.IPasswordResetRequest,
      },
    );

  // 4) Type validation
  typia.assert(ack);

  // 5) Non-enumeration: message must not echo the submitted email
  TestValidator.predicate(
    "security event message must not contain submitted email",
    ack.message.toLowerCase().includes(email.toLowerCase()) === false,
  );

  // 6) Content sanity and timestamp recency
  TestValidator.predicate(
    "security event code should be non-empty",
    ((): boolean => ack.code.trim().length > 0)(),
  );
  TestValidator.predicate(
    "security event message should be non-empty",
    ((): boolean => ack.message.trim().length > 0)(),
  );
  TestValidator.predicate(
    "security event timestamp should be recent (<= 5 minutes)",
    ((): boolean => {
      const ts = new Date(ack.timestamp).getTime();
      if (Number.isNaN(ts)) return false;
      const diff = Math.abs(Date.now() - ts);
      return diff <= 5 * 60 * 1000 && ts >= startedAt - 60 * 1000; // within 5m and not far before start
    })(),
  );
}
