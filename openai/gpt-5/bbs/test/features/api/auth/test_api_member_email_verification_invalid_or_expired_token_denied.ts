import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Verify that invalid or expired email verification tokens are rejected.
 *
 * Context:
 *
 * - Members confirm their email via a time-limited token delivered out-of-band.
 * - Invalid/forged/expired tokens must be rejected without leaking account
 *   details.
 *
 * Strategy:
 *
 * - Generate a syntactically valid token (>= 20 chars) so that the request body
 *   satisfies DTO constraints, but which is not a real/issued token.
 * - Invoke POST /auth/member/email/verify and assert an error occurs.
 * - Do not assert specific HTTP status codes or response payloads. We also do not
 *   verify account state changes due to lack of read APIs.
 */
export async function test_api_member_email_verification_invalid_or_expired_token_denied(
  connection: api.IConnection,
) {
  // 1) Prepare a forged token that satisfies MinLength<20> (syntactically valid)
  const forgedToken: string & tags.MinLength<20> = typia.random<
    string & tags.MinLength<20>
  >();

  // 2) Expect rejection for invalid/expired token
  await TestValidator.error(
    "invalid/expired verification token must be rejected",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: forgedToken,
        } satisfies IEconDiscussMember.IEmailVerifyRequest,
      });
    },
  );

  // 3) Optional: try again with another forged token to ensure consistent rejection
  const anotherForged: string & tags.MinLength<20> = typia.random<
    string & tags.MinLength<20>
  >();
  await TestValidator.error(
    "another forged token must also be rejected",
    async () => {
      await api.functional.auth.member.email.verify.verifyEmail(connection, {
        body: {
          token: anotherForged,
        } satisfies IEconDiscussMember.IEmailVerifyRequest,
      });
    },
  );
}
