import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Resend verification email for an unverified member and validate auth
 * boundary.
 *
 * Business flow:
 *
 * 1. Register a new member (emailVerified=false by policy) using join API.
 *
 *    - SDK auto-injects Authorization header with issued access token.
 * 2. Call resend verification endpoint with the authenticated connection.
 *
 *    - Validate type and that email_verified remains false (resend doesn’t verify).
 *    - If email is disclosed in response, ensure it matches the registered email.
 * 3. Authentication boundary: call the resend endpoint with an unauthenticated
 *    connection and expect an error.
 *
 * Notes:
 *
 * - Follow only provided SDK operations (join, resendVerification); no verify
 *   step.
 * - Never manipulate connection.headers directly (SDK manages tokens). For the
 *   unauthenticated check, clone the connection with empty headers.
 */
export async function test_api_member_email_verification_resend_when_unverified(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated clone for boundary testing (do not mutate original)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Register a new member (unverified by default)
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Optional subject snapshot: verify initial emailVerified flag when available
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "newly joined member should be unverified",
      authorized.member.emailVerified,
      false,
    );
  }

  // 2) Resend verification email with authenticated connection
  const ack =
    await api.functional.auth.member.email.verification.resend.resendVerification(
      connection,
    );
  typia.assert(ack);

  // Resend does not auto-verify: it should remain false
  TestValidator.equals(
    "resend keeps email_verified=false until token confirmation",
    ack.email_verified,
    false,
  );

  // If email is disclosed, it must match the registered email
  if (ack.email !== undefined) {
    TestValidator.equals(
      "ack email matches the registered email when disclosed",
      ack.email,
      email,
    );
  }

  // 3) Authentication boundary: unauthenticated call must fail
  await TestValidator.error(
    "unauthenticated member cannot request resend",
    async () => {
      await api.functional.auth.member.email.verification.resend.resendVerification(
        unauthConn,
      );
    },
  );
}
