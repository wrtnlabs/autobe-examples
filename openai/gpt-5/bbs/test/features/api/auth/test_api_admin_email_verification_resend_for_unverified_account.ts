import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Resend verification email for an unverified admin account (public endpoint).
 *
 * Business flow
 *
 * 1. Register a fresh administrator through join (expected emailVerified=false
 *    until verification completes).
 * 2. Call the public resend endpoint with the joined email using an
 *    unauthenticated connection clone.
 * 3. Validate non-leaky, neutral acknowledgement via
 *    IEconDiscussAdmin.ISecurityEvent.
 * 4. Optionally validate the admin subject projection from join shows
 *    emailVerified=false when provided.
 * 5. Call resend twice to confirm idempotent/neutral acknowledgement on repeated
 *    requests.
 *
 * Notes
 *
 * - Do not touch connection.headers directly; create a new connection with empty
 *   headers for public call.
 * - Do not assert specific HTTP status codes; validate type and basic business
 *   signals only.
 */
export async function test_api_admin_email_verification_resend_for_unverified_account(
  connection: api.IConnection,
) {
  // 1) Register a fresh administrator (unverified by policy)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const createBody = {
    email,
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(authorized);

  // If admin subject projection is provided, ensure initial unverified state (policy)
  if (authorized.admin) {
    typia.assertGuard<IEconDiscussAdmin.ISubject>(authorized.admin);
    TestValidator.equals(
      "new admin should start with emailVerified=false",
      authorized.admin.emailVerified,
      false,
    );
  }

  // 2) Create a public (unauthenticated) connection clone for the resend call
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 3) Call resend with the created email (neutral acknowledgment expected)
  const resendBody1 = {
    email,
  } satisfies IEconDiscussAdmin.IEmailResendRequest;

  const ack1: IEconDiscussAdmin.ISecurityEvent =
    await api.functional.auth.admin.email.resend.resendVerificationEmail(
      publicConn,
      { body: resendBody1 },
    );
  typia.assert(ack1);
  TestValidator.predicate(
    "security event outcome should be a non-empty string (acknowledgement)",
    ack1.outcome.length > 0,
  );
  // occurred_at is validated by typia.assert via date-time format.

  // 5) Call resend twice to check idempotent/neutral acknowledgement
  const resendBody2 = {
    email,
  } satisfies IEconDiscussAdmin.IEmailResendRequest;

  const ack2: IEconDiscussAdmin.ISecurityEvent =
    await api.functional.auth.admin.email.resend.resendVerificationEmail(
      publicConn,
      { body: resendBody2 },
    );
  typia.assert(ack2);
  TestValidator.predicate(
    "second resend should also acknowledge neutrally",
    ack2.outcome.length > 0,
  );
}
