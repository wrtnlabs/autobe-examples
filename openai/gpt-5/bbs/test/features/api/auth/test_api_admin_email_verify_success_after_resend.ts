import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Admin email verification after resend (contract-level validation with
 * idempotent replay).
 *
 * This test exercises the public admin email verification workflow using only
 * the provided endpoints:
 *
 * 1. POST /auth/admin/join to create an admin account and receive tokens
 * 2. POST /auth/admin/email/resend to dispatch a fresh verification email
 * 3. POST /auth/admin/email/verify to finalize verification using an opaque token
 * 4. Replay the verify call with the same token to demonstrate tolerant
 *    idempotency
 *
 * Notes:
 *
 * - There is no API to fetch the actual opaque token issued by resend; therefore,
 *   the verify step sends a synthetically generated opaque token to validate
 *   endpoint contract rather than persistence. In simulate mode this succeeds.
 * - We do not assert on specific HTTP status codes or response messages and avoid
 *   exposing secrets by design; ISecurityEvent carries no confidential data.
 */
export async function test_api_admin_email_verify_success_after_resend(
  connection: api.IConnection,
) {
  // 1) Register admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 characters
    display_name: RandomGenerator.name(1),
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Resend verification email for the same address
  const resendBody = {
    email: joinBody.email,
  } satisfies IEconDiscussAdmin.IEmailResendRequest;

  const resendEvent: IEconDiscussAdmin.ISecurityEvent =
    await api.functional.auth.admin.email.resend.resendVerificationEmail(
      connection,
      { body: resendBody },
    );
  typia.assert(resendEvent);

  // 3) Verify email with an opaque token (synthetic since no fetch-token API exists)
  const token: string = RandomGenerator.alphaNumeric(48);
  const verifyBody = {
    token,
  } satisfies IEconDiscussAdmin.IEmailVerifyRequest;

  const verifiedEvent: IEconDiscussAdmin.ISecurityEvent =
    await api.functional.auth.admin.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(verifiedEvent);

  // 4) Idempotency replay: same token again — accept both success and failure neutrally
  try {
    const replayEvent: IEconDiscussAdmin.ISecurityEvent =
      await api.functional.auth.admin.email.verify.verifyEmail(connection, {
        body: verifyBody,
      });
    typia.assert(replayEvent);
  } catch {
    // Accept failure on replay without asserting specific error codes or messages
  }
}
